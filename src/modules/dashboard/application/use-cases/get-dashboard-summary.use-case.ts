import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import type { UseCase } from '../../../../shared/application/use-case';
import { BUSINESS_TZ } from '../../../../shared/domain/business-time';
import { PartnerScopeService } from '../../../sale-points/application/services/partner-scope.service';
import { UserRole } from '../../../users/domain/value-objects/user-role';
import type {
  DashboardSummaryOutput,
  RecentWinnerPreview,
  RankingItem,
} from '../dtos/dashboard-summary.output';

/** Managua es UTC-6 fijo (sin DST). Ver `BusinessTime` helper. */
const BUSINESS_TZ_OFFSET_HOURS = -6;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface DashboardSummaryInput {
  requesterId: string;
  requesterRole: UserRole;
  /** Inicio del rango a resumir (inclusive). Default = medianoche de hoy en Managua. */
  from?: Date;
  /** Fin del rango a resumir (exclusive-ish, inclusivo hasta 23:59:59). Default = fin del día de hoy. */
  to?: Date;
}

/** Scope of ACTIVE sale_points visible to the requester (never null). */
type SalePointScope = string[];

/**
 * Rango efectivo resuelto: [from, to) para la ventana pedida y su
 * equivalente previo inmediato para calcular deltas.
 */
interface Ranges {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
}

/**
 * Cache in-memory con TTL corto del dashboard summary completo.
 * Key = requesterId + from + to. Kills back-to-back hits (usuario que
 * refresca varias veces o tabbea entre pantallas y vuelve). TTL 20s
 * porque los KPIs "de hoy" deben sentirse frescos — pero no re-computar
 * el mismo state si hits ocurren dentro de esa ventana.
 */
const _summaryCache = new Map<
  string,
  { value: DashboardSummaryOutput; expiresAt: number }
>();
const SUMMARY_TTL_MS = 20 * 1000;

const EMPTY_SUMMARY: DashboardSummaryOutput = {
  billed: 0,
  won: 0,
  profit: 0,
  tickets: 0,
  averageTicket: 0,
  billedPrev: 0,
  wonPrev: 0,
  profitPrev: 0,
  ticketsPrev: 0,
  weeklyBilled: 0,
  weeklyBilledPrev: 0,
  totalUsers: 0,
  byGame: [],
  recentWinners: { count: 0, totalAmount: 0, items: [] },
  topSellers: [],
  topSalePoints: [],
};

/**
 * SQL CASE expression that replicates TicketEvaluator.evaluateWith() in the
 * database. Required table aliases: tickets → t, games → g,
 * ticket_lines → tl, draw_results → dr.
 *
 * Must be kept in sync with TicketEvaluator whenever game-type logic changes.
 */
const PRIZE_SQL = `
  CASE
    -- REGULAR / FOUR_DIGIT: strip (F), trim, lowercase
    WHEN g.type IN ('regular', 'four_digit')
      AND LOWER(TRIM(REGEXP_REPLACE(tl.label, '\\(F\\)', '', 'i')))
          = LOWER(TRIM(dr.winning_number))
      THEN tl.prize

    -- DATE: normalize spaces to dashes in both sides
    WHEN g.type = 'date'
      AND LOWER(REGEXP_REPLACE(TRIM(tl.label), '\\s+', '-', 'g'))
          = LOWER(REGEXP_REPLACE(TRIM(dr.winning_number), '\\s+', '-', 'g'))
      THEN tl.prize

    -- THREE_DIGIT exact (no (F) in label)
    WHEN g.type = 'three_digit'
      AND tl.label NOT ILIKE '%(F)%'
      AND TRIM(tl.label) = TRIM(dr.winning_number)
      THEN tl.prize

    -- THREE_DIGIT easy/falso ((F) in label): sorted digits must match
    WHEN g.type = 'three_digit'
      AND tl.label ILIKE '%(F)%'
      AND (
        SELECT string_agg(ch, '' ORDER BY ch)
        FROM unnest(string_to_array(
          TRIM(REGEXP_REPLACE(tl.label, '\\(F\\)', '', 'i')), NULL
        )) AS ch
      ) = (
        SELECT string_agg(ch, '' ORDER BY ch)
        FROM unnest(string_to_array(TRIM(dr.winning_number), NULL)) AS ch
      )
      THEN
        -- Pair-easy: snapshot exists AND winning_number has a repeated digit
        CASE
          WHEN tl.pair_easy_prize IS NOT NULL AND (
            SUBSTRING(dr.winning_number, 1, 1) = SUBSTRING(dr.winning_number, 2, 1) OR
            SUBSTRING(dr.winning_number, 1, 1) = SUBSTRING(dr.winning_number, 3, 1) OR
            SUBSTRING(dr.winning_number, 2, 1) = SUBSTRING(dr.winning_number, 3, 1)
          )
            THEN tl.pair_easy_prize
          ELSE tl.prize
        END

    ELSE 0
  END
`.trim();

/**
 * Aggregates the numbers powering the home dashboard.
 *
 * Everything is scoped by the caller: admins see the whole operation, partners
 * see only their sucursales, and no cross-partner leakage is possible because
 * the scope is derived server-side from the JWT.
 *
 * All prize computation runs entirely in PostgreSQL via PRIZE_SQL — no tickets
 * are loaded into memory, avoiding the TypeORM two-phase pagination bug and
 * eliminating thousands of rows of network traffic per request.
 */
@Injectable()
export class GetDashboardSummary
  implements UseCase<DashboardSummaryInput, DashboardSummaryOutput>
{
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly partnerScope: PartnerScopeService,
  ) {}

  async execute(input: DashboardSummaryInput): Promise<DashboardSummaryOutput> {
    const scope = await this.partnerScope.getAccessibleSalePointIds(
      input.requesterId,
      input.requesterRole,
    );
    // Sin sucursales visibles → todo en cero, no queries.
    if (scope.length === 0) return EMPTY_SUMMARY;

    const ranges = this.resolveRanges(input.from, input.to);

    const summaryKey = this.buildSummaryCacheKey(
      input.requesterId,
      ranges.from,
      ranges.to,
    );
    const now = Date.now();
    const cachedSummary = _summaryCache.get(summaryKey);
    if (cachedSummary && cachedSummary.expiresAt > now) {
      return cachedSummary.value;
    }

    const [
      kpis,
      wonKpis,
      byGame,
      recentWinners,
      topSellers,
      topSalePoints,
    ] = await Promise.all([
      this.loadKpis(scope, ranges),
      this.loadWonKpis(scope, ranges),
      this.loadGameBreakdown(scope, ranges),
      this.loadRecentWinners(scope),
      this.loadTopSellers(scope, ranges),
      this.loadTopSalePoints(scope, ranges),
    ]);
    const profit = kpis.billed - wonKpis.won;
    const profitPrev = kpis.billedPrev - wonKpis.wonPrev;

    const summary: DashboardSummaryOutput = {
      ...kpis,
      ...wonKpis,
      profit,
      profitPrev,
      byGame,
      recentWinners,
      topSellers,
      topSalePoints,
    };

    _summaryCache.set(summaryKey, {
      value: summary,
      expiresAt: Date.now() + SUMMARY_TTL_MS,
    });
    if (_summaryCache.size > 200) {
      const nowMs = Date.now();
      for (const [k, entry] of _summaryCache) {
        if (entry.expiresAt <= nowMs) _summaryCache.delete(k);
      }
    }

    return summary;
  }

  private buildSummaryCacheKey(
    requesterId: string,
    from: Date,
    to: Date,
  ): string {
    return `${requesterId}|${from.getTime()}|${to.getTime()}`;
  }

  // --- Ranges ---------------------------------------------------------------

  private resolveRanges(from: Date | undefined, to: Date | undefined): Ranges {
    if (from === undefined || to === undefined) {
      const { todayStart, todayEnd, yesterdayStart } = this.todayBoundaries();
      return {
        from: todayStart,
        to: todayEnd,
        prevFrom: yesterdayStart,
        prevTo: todayStart,
      };
    }
    const inclusiveTo = new Date(to.getTime() + 1);
    const durationMs = inclusiveTo.getTime() - from.getTime();
    const prevTo = new Date(from.getTime());
    const prevFrom = new Date(from.getTime() - durationMs);
    return {
      from,
      to: inclusiveTo,
      prevFrom,
      prevTo,
    };
  }

  private todayBoundaries(): {
    todayStart: Date;
    todayEnd: Date;
    yesterdayStart: Date;
  } {
    const offsetMs = BUSINESS_TZ_OFFSET_HOURS * 60 * 60 * 1000;
    const nowBiz = new Date(Date.now() + offsetMs);
    const y = nowBiz.getUTCFullYear();
    const m = nowBiz.getUTCMonth();
    const d = nowBiz.getUTCDate();
    const managuaMidnightUtcMs = (day: number) =>
      Date.UTC(y, m, day) - offsetMs;
    return {
      todayStart: new Date(managuaMidnightUtcMs(d)),
      todayEnd: new Date(managuaMidnightUtcMs(d + 1)),
      yesterdayStart: new Date(managuaMidnightUtcMs(d - 1)),
    };
  }

  // --- Won KPIs (pure SQL) --------------------------------------------------

  /**
   * Computes won prizes for the current and previous period entirely in SQL.
   * Replaces the previous approach of loading up to 100 000 tickets into
   * memory and evaluating them with TicketEvaluator — which was the root cause
   * of the "bind message has N parameter formats but 0 parameters" error and
   * caused the dashboard to be very slow.
   *
   * Only tickets with an executed draw_result (INNER JOIN) are counted; tickets
   * for future/pending draws contribute 0, which matches TicketEvaluator's
   * behavior (it returns hasPendingDraw=true and totalPrize=0 when no result
   * is found).
   */
  private async loadWonKpis(
    scope: SalePointScope,
    ranges: Ranges,
  ): Promise<{ won: number; wonPrev: number }> {
    // $1 = scope, $2 = prevFrom, $3 = from (boundary current vs prev), $4 = to
    const rows = await this.dataSource.query<
      Array<{ won: string; won_prev: string }>
    >(
      `
      SELECT
        COALESCE(SUM(CASE WHEN tp.created_at >= $3 THEN tp.total_prize ELSE 0 END), 0)::bigint AS won,
        COALESCE(SUM(CASE WHEN tp.created_at <  $3 THEN tp.total_prize ELSE 0 END), 0)::bigint AS won_prev
      FROM (
        SELECT
          t.created_at,
          SUM(${PRIZE_SQL}) AS total_prize
        FROM tickets t
        JOIN games g         ON g.id         = t.game_id
        JOIN ticket_lines tl ON tl.ticket_id = t.id
        JOIN draw_results dr
          ON dr.game_id = t.game_id AND dr.draw_at = t.draw_at
        WHERE t.status          = 'valid'
          AND t.sale_point_id   = ANY($1::uuid[])
          AND t.created_at     >= $2::timestamptz
          AND t.created_at     <  $4::timestamptz
        GROUP BY t.id, t.created_at
      ) tp
      `,
      [scope, ranges.prevFrom, ranges.from, ranges.to],
    );
    const row = rows[0];
    return {
      won:     Number(row?.won     ?? 0),
      wonPrev: Number(row?.won_prev ?? 0),
    };
  }

  // --- KPIs -----------------------------------------------------------------

  private async loadKpis(
    scope: SalePointScope,
    ranges: Ranges,
  ): Promise<
    Omit<
      DashboardSummaryOutput,
      | 'won'
      | 'wonPrev'
      | 'profit'
      | 'profitPrev'
      | 'byGame'
      | 'recentWinners'
      | 'topSellers'
      | 'topSalePoints'
    >
  > {
    const rows = await this.dataSource.query<
      Array<{
        billed: string;
        tickets: string;
        billed_prev: string;
        tickets_prev: string;
        weekly_billed: string;
        weekly_billed_prev: string;
        total_users: string;
      }>
    >(
      `
      SELECT
        COALESCE(SUM(CASE
          WHEN t.status = 'valid'
           AND t.created_at >= $3::timestamptz AND t.created_at < $4::timestamptz
          THEN t.total ELSE 0 END), 0)::bigint AS billed,
        COALESCE(SUM(CASE
          WHEN t.status = 'valid'
           AND t.created_at >= $3::timestamptz AND t.created_at < $4::timestamptz
          THEN 1 ELSE 0 END), 0)::bigint AS tickets,

        COALESCE(SUM(CASE
          WHEN t.status = 'valid'
           AND t.created_at >= $5::timestamptz AND t.created_at < $6::timestamptz
          THEN t.total ELSE 0 END), 0)::bigint AS billed_prev,
        COALESCE(SUM(CASE
          WHEN t.status = 'valid'
           AND t.created_at >= $5::timestamptz AND t.created_at < $6::timestamptz
          THEN 1 ELSE 0 END), 0)::bigint AS tickets_prev,

        COALESCE(SUM(CASE
          WHEN t.status = 'valid'
           AND (t.created_at AT TIME ZONE $1)::date BETWEEN
                 date_trunc('week', now() AT TIME ZONE $1)::date
                 AND (now() AT TIME ZONE $1)::date
          THEN t.total ELSE 0 END), 0)::bigint AS weekly_billed,
        COALESCE(SUM(CASE
          WHEN t.status = 'valid'
           AND (t.created_at AT TIME ZONE $1)::date BETWEEN
                 (date_trunc('week', now() AT TIME ZONE $1)::date - INTERVAL '7 days')::date
                 AND ((now() AT TIME ZONE $1)::date - INTERVAL '7 days')::date
          THEN t.total ELSE 0 END), 0)::bigint AS weekly_billed_prev,

        (
          SELECT COUNT(*) FROM users u
          WHERE u.sale_point_id = ANY($2::uuid[])
        )::bigint AS total_users
      FROM tickets t
      WHERE t.sale_point_id = ANY($2::uuid[])
      `,
      [BUSINESS_TZ, scope, ranges.from, ranges.to, ranges.prevFrom, ranges.prevTo],
    );
    const row = rows[0];
    const billed = Number(row?.billed ?? 0);
    const tickets = Number(row?.tickets ?? 0);
    const billedPrev = Number(row?.billed_prev ?? 0);
    const ticketsPrev = Number(row?.tickets_prev ?? 0);
    return {
      billed,
      tickets,
      averageTicket: tickets === 0 ? 0 : Math.round(billed / tickets),
      billedPrev,
      ticketsPrev,
      weeklyBilled: Number(row?.weekly_billed ?? 0),
      weeklyBilledPrev: Number(row?.weekly_billed_prev ?? 0),
      totalUsers: Number(row?.total_users ?? 0),
    };
  }

  // --- By game --------------------------------------------------------------

  private async loadGameBreakdown(
    scope: SalePointScope,
    ranges: Ranges,
  ): Promise<DashboardSummaryOutput['byGame']> {
    const rows = await this.dataSource.query<
      Array<{ id: string; name: string; billed: string }>
    >(
      `
      SELECT
        g.id,
        g.name,
        COALESCE(SUM(CASE
          WHEN t.status = 'valid'
           AND t.created_at >= $2::timestamptz AND t.created_at < $3::timestamptz
           AND t.sale_point_id = ANY($1::uuid[])
          THEN t.total ELSE 0 END), 0)::bigint AS billed
      FROM games g
      LEFT JOIN tickets t ON t.game_id = g.id
      GROUP BY g.id, g.name, g.order_index
      ORDER BY g.order_index ASC
      `,
      [scope, ranges.from, ranges.to],
    );
    return rows.map((r) => ({
      gameId: r.id,
      gameName: r.name,
      billed: Number(r.billed),
      won: 0,
    }));
  }

  // --- Recent winners (pure SQL) --------------------------------------------

  /**
   * Returns count, total prize, and top-4 preview of winning tickets in the
   * last 30 days. Runs entirely in SQL — no tickets are loaded into memory.
   */
  private async loadRecentWinners(
    scope: SalePointScope,
  ): Promise<DashboardSummaryOutput['recentWinners']> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * MS_PER_DAY);

    type PreviewRow = {
      ticketId: string;
      folio: string;
      gameId: string;
      gameName: string;
      drawAt: string;
      totalPrize: number;
      client: string | null;
    };
    const rows = await this.dataSource.query<
      Array<{
        winner_count: string;
        total_amount: string;
        preview_json: PreviewRow[] | null;
      }>
    >(
      `
      WITH raw_prizes AS (
        SELECT
          t.id,
          t.folio,
          t.game_id,
          g.name   AS game_name,
          t.draw_at,
          t.client,
          SUM(${PRIZE_SQL}) AS total_prize
        FROM tickets t
        JOIN games g         ON g.id         = t.game_id
        JOIN ticket_lines tl ON tl.ticket_id = t.id
        JOIN draw_results dr
          ON dr.game_id = t.game_id AND dr.draw_at = t.draw_at
        WHERE t.status        = 'valid'
          AND t.sale_point_id = ANY($1::uuid[])
          AND t.created_at   >= $2::timestamptz
        GROUP BY t.id, t.folio, t.game_id, g.name, t.draw_at, t.client
      ),
      winning AS (
        SELECT * FROM raw_prizes WHERE total_prize > 0
      )
      SELECT
        COUNT(*)::bigint                      AS winner_count,
        COALESCE(SUM(total_prize), 0)::bigint AS total_amount,
        (
          SELECT json_agg(p)
          FROM (
            SELECT
              id        AS "ticketId",
              folio,
              game_id   AS "gameId",
              game_name AS "gameName",
              to_char(draw_at AT TIME ZONE 'UTC',
                      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "drawAt",
              total_prize AS "totalPrize",
              client
            FROM winning
            ORDER BY draw_at DESC
            LIMIT 4
          ) p
        ) AS preview_json
      FROM winning
      `,
      [scope, thirtyDaysAgo],
    );

    const row = rows[0];
    const count       = Number(row?.winner_count ?? 0);
    const totalAmount = Number(row?.total_amount  ?? 0);

    const items: RecentWinnerPreview[] = (row?.preview_json ?? []).map((p) => ({
      ticketId:   p.ticketId,
      folio:      p.folio,
      gameId:     p.gameId,
      gameName:   p.gameName ?? '—',
      drawAt:     p.drawAt,
      totalPrize: Number(p.totalPrize),
      client:     p.client ?? null,
    }));

    return { count, totalAmount, items };
  }

  // --- Top sellers / sale points --------------------------------------------

  private async loadTopSellers(
    scope: SalePointScope,
    ranges: Ranges,
  ): Promise<RankingItem[]> {
    const rows = await this.dataSource.query<
      Array<{ id: string; name: string; amount: string; ticket_count: string }>
    >(
      `
      SELECT
        u.id,
        u.name,
        COALESCE(SUM(t.total), 0)::bigint AS amount,
        COUNT(t.id)::bigint AS ticket_count
      FROM users u
      LEFT JOIN tickets t
        ON t.seller_id = u.id
       AND t.status = 'valid'
       AND t.created_at >= $2::timestamptz AND t.created_at < $3::timestamptz
       AND t.sale_point_id = ANY($1::uuid[])
      WHERE u.role = 'seller'
        AND u.sale_point_id = ANY($1::uuid[])
      GROUP BY u.id, u.name
      HAVING COALESCE(SUM(t.total), 0) > 0
      ORDER BY amount DESC
      LIMIT 5
      `,
      [scope, ranges.from, ranges.to],
    );
    return rows.map((r) => ({
      id:          r.id,
      name:        r.name,
      amount:      Number(r.amount),
      ticketCount: Number(r.ticket_count),
    }));
  }

  private async loadTopSalePoints(
    scope: SalePointScope,
    ranges: Ranges,
  ): Promise<RankingItem[]> {
    const rows = await this.dataSource.query<
      Array<{ id: string; name: string; amount: string; ticket_count: string }>
    >(
      `
      SELECT
        sp.id,
        sp.name,
        COALESCE(SUM(t.total), 0)::bigint AS amount,
        COUNT(t.id)::bigint AS ticket_count
      FROM sale_points sp
      LEFT JOIN tickets t
        ON t.sale_point_id = sp.id
       AND t.status = 'valid'
       AND t.created_at >= $2::timestamptz AND t.created_at < $3::timestamptz
      WHERE sp.id = ANY($1::uuid[])
      GROUP BY sp.id, sp.name
      HAVING COALESCE(SUM(t.total), 0) > 0
      ORDER BY amount DESC
      LIMIT 5
      `,
      [scope, ranges.from, ranges.to],
    );
    return rows.map((r) => ({
      id:          r.id,
      name:        r.name,
      amount:      Number(r.amount),
      ticketCount: Number(r.ticket_count),
    }));
  }
}
