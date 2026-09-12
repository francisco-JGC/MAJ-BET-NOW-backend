import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import type { UseCase } from '../../../../shared/application/use-case';
import {
  SALE_POINTS_REPOSITORY,
  type SalePointsRepository,
} from '../../../sale-points/domain/repositories/sale-points.repository';
import { PartnerScopeService } from '../../../sale-points/application/services/partner-scope.service';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../../../users/domain/repositories/users.repository';
import { UserRole } from '../../../users/domain/value-objects/user-role';
import type {
  MovementsBalanceOutput,
  MovementsBalanceRow,
} from '../dtos/movements-balance.output';

export interface GetMovementsBalanceInput {
  requesterId: string;
  requesterRole: UserRole;
  salePointId?: string;
  /**
   * Filtro multi-sucursal. Se intersecta con el partner scope — si el
   * operador manda una sucursal a la que no tiene acceso, se descarta
   * silenciosamente en vez de exponerla. `salePointId` singular tiene
   * precedencia si viene también (compat legacy).
   */
  salePointIds?: string[];
  gameId?: string;
  /** "HH:MM" wall-clock en zona Managua. */
  drawTime?: string;
  from?: Date;
  to?: Date;
}

interface RawRow {
  sale_point_id: string;
  billed: string;
  won_prize: string;
  deposits: string;
  withdrawals: string;
  expenses: string;
  adjustments: string;
}

/**
 * SQL CASE expression that replicates TicketEvaluator.evaluateWith() in the
 * database. Required aliases: tickets → t, games → g,
 * ticket_lines → tl, draw_results → dr.
 *
 * Must be kept in sync with TicketEvaluator whenever game-type logic changes.
 */
const PRIZE_SQL = `
  CASE
    WHEN g.type IN ('regular', 'four_digit')
      AND LOWER(TRIM(REGEXP_REPLACE(tl.label, '\\(F\\)', '', 'i')))
          = LOWER(TRIM(dr.winning_number))
      THEN tl.prize

    WHEN g.type = 'date'
      AND LOWER(REGEXP_REPLACE(TRIM(tl.label), '\\s+', '-', 'g'))
          = LOWER(REGEXP_REPLACE(TRIM(dr.winning_number), '\\s+', '-', 'g'))
      THEN tl.prize

    WHEN g.type = 'three_digit'
      AND tl.label NOT ILIKE '%(F)%'
      AND TRIM(tl.label) = TRIM(dr.winning_number)
      THEN tl.prize

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
 * Combines ticket cash flow (sales − prizes) with manually-registered
 * movements (deposits, withdrawals, expenses) into a per-sucursal balance.
 *
 * All prize computation runs in SQL (PRIZE_SQL) — no tickets are loaded into
 * memory. A single CTE query computes billed, wonPrize, and movements together.
 *
 * Filter behaviour with gameId / drawTime:
 *   - ticket_flow and won_flow both apply the game/draw filters.
 *   - movement_flow never filters by game/draw (movements have no game
 *     association — a deposit belongs to the whole date range, not a draw).
 *   - Rows where ticket_flow is NULL (sale points with movements but ZERO
 *     matching tickets for the active filter) are hidden when a game or
 *     drawTime filter is set, so they don't appear as "erroneous sales".
 */
@Injectable()
export class GetMovementsBalance
  implements UseCase<GetMovementsBalanceInput, MovementsBalanceOutput>
{
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(SALE_POINTS_REPOSITORY)
    private readonly salePoints: SalePointsRepository,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    private readonly scope: PartnerScopeService,
  ) {}

  async execute(
    input: GetMovementsBalanceInput,
  ): Promise<MovementsBalanceOutput> {
    if (input.requesterRole === UserRole.SELLER) return { items: [] };

    const partnerScope = await this.scope.getAccessibleSalePointIds(
      input.requesterId,
      input.requesterRole,
    );
    if (partnerScope.length === 0) return { items: [] };

    const effectiveScope =
      input.salePointIds && input.salePointIds.length > 0
        ? partnerScope.filter((id) => input.salePointIds!.includes(id))
        : partnerScope;
    if (effectiveScope.length === 0) return { items: [] };

    // Single CTE round-trip: billed + movements + wonPrize together.
    //
    // ticket_flow  — sum of valid ticket totals, filtered by game/draw if set.
    // movement_flow — sum of each movement type; never filtered by game/draw.
    // won_flow     — prizes won in SQL (PRIZE_SQL), same filters as ticket_flow.
    //
    // JOIN behaviour:
    //   FULL OUTER JOIN so sale points with movements but no tickets appear when
    //   there is NO game/draw filter (financial picture of the period).
    //   The final WHERE hides "movement-only" rows when a game or drawTime
    //   filter is active — those rows have billed=0 and wonPrize=0, making
    //   them look like erroneous sales.
    //
    // Parameters: $1=salePointId, $2=from, $3=to, $4=effectiveScope,
    //             $5=gameId, $6=drawTime
    const rows = await this.dataSource.query<RawRow[]>(
      `
      WITH
        ticket_flow AS (
          SELECT
            t.sale_point_id::text AS sale_point_id,
            COALESCE(SUM(CASE WHEN t.status = 'valid' THEN t.total ELSE 0 END), 0)::bigint AS billed
          FROM tickets t
          WHERE ($1::uuid IS NULL OR t.sale_point_id = $1::uuid)
            AND ($2::timestamptz IS NULL OR t.created_at >= $2::timestamptz)
            AND ($3::timestamptz IS NULL OR t.created_at <  $3::timestamptz)
            AND t.sale_point_id = ANY($4::uuid[])
            AND ($5::uuid IS NULL OR t.game_id = $5::uuid)
            AND ($6::text IS NULL OR to_char(t.draw_at AT TIME ZONE 'America/Managua', 'HH24:MI') = $6::text)
          GROUP BY t.sale_point_id
        ),
        movement_flow AS (
          SELECT
            m.sale_point_id::text AS sale_point_id,
            COALESCE(SUM(CASE WHEN m.type = 'deposit'    THEN m.amount ELSE 0 END), 0)::bigint AS deposits,
            COALESCE(SUM(CASE WHEN m.type = 'withdrawal' THEN m.amount ELSE 0 END), 0)::bigint AS withdrawals,
            COALESCE(SUM(CASE WHEN m.type = 'expense'    THEN m.amount ELSE 0 END), 0)::bigint AS expenses,
            COALESCE(SUM(CASE WHEN m.type = 'adjustment' THEN m.amount ELSE 0 END), 0)::bigint AS adjustments
          FROM movements m
          WHERE ($1::uuid IS NULL OR m.sale_point_id = $1::uuid)
            AND ($2::timestamptz IS NULL OR m.occurred_at >= $2::timestamptz)
            AND ($3::timestamptz IS NULL OR m.occurred_at <  $3::timestamptz)
            AND m.sale_point_id = ANY($4::uuid[])
          GROUP BY m.sale_point_id
        ),
        won_flow AS (
          SELECT
            t.sale_point_id::text AS sale_point_id,
            SUM(${PRIZE_SQL})     AS won_prize
          FROM tickets t
          JOIN games g         ON g.id         = t.game_id
          JOIN ticket_lines tl ON tl.ticket_id = t.id
          JOIN draw_results dr
            ON dr.game_id = t.game_id AND dr.draw_at = t.draw_at
          WHERE t.status = 'valid'
            AND ($1::uuid IS NULL OR t.sale_point_id = $1::uuid)
            AND ($2::timestamptz IS NULL OR t.created_at >= $2::timestamptz)
            AND ($3::timestamptz IS NULL OR t.created_at <  $3::timestamptz)
            AND t.sale_point_id = ANY($4::uuid[])
            AND ($5::uuid IS NULL OR t.game_id = $5::uuid)
            AND ($6::text IS NULL OR to_char(t.draw_at AT TIME ZONE 'America/Managua', 'HH24:MI') = $6::text)
          GROUP BY t.sale_point_id
        )
      SELECT
        COALESCE(tf.sale_point_id, mf.sale_point_id)  AS sale_point_id,
        COALESCE(tf.billed,        0)::bigint          AS billed,
        COALESCE(wf.won_prize,     0)::bigint          AS won_prize,
        COALESCE(mf.deposits,      0)::bigint          AS deposits,
        COALESCE(mf.withdrawals,   0)::bigint          AS withdrawals,
        COALESCE(mf.expenses,      0)::bigint          AS expenses,
        COALESCE(mf.adjustments,   0)::bigint          AS adjustments
      FROM ticket_flow tf
      FULL OUTER JOIN movement_flow mf ON mf.sale_point_id = tf.sale_point_id
      LEFT JOIN won_flow wf
        ON wf.sale_point_id = COALESCE(tf.sale_point_id, mf.sale_point_id)
      WHERE
        -- Include movement-only rows (tf IS NULL) only when no game/draw
        -- filter is active. With a filter, those rows have billed=0 / won=0
        -- and look like erroneous entries to the operator.
        (tf.sale_point_id IS NOT NULL)
        OR ($5::uuid IS NULL AND $6::text IS NULL)
      `,
      [
        input.salePointId ?? null,
        input.from ?? null,
        input.to ?? null,
        effectiveScope,
        input.gameId ?? null,
        input.drawTime ?? null,
      ],
    );

    if (rows.length === 0) return { items: [] };

    // Bulk-resolve sale point + partner names.
    const salePointIds = rows.map((r) => r.sale_point_id);
    const salePoints = await Promise.all(
      salePointIds.map((id) => this.salePoints.findById(id)),
    );
    const salePointById = new Map(
      salePoints
        .filter((sp): sp is NonNullable<typeof sp> => sp !== null)
        .map((sp) => [sp.id, sp]),
    );

    const partnerIds = Array.from(
      new Set(
        salePoints
          .filter((sp): sp is NonNullable<typeof sp> => sp !== null)
          .map((sp) => sp.ownerPartnerId)
          .filter((id): id is string => id !== null),
      ),
    );
    const partners = await this.users.findByIds(partnerIds);
    const partnerById = new Map(partners.map((p) => [p.id, p]));

    const items: MovementsBalanceRow[] = rows.map((r) => {
      const sp = salePointById.get(r.sale_point_id);
      const billed      = Number(r.billed);
      const wonPrize    = Number(r.won_prize);
      const deposits    = Number(r.deposits);
      const withdrawals = Number(r.withdrawals);
      const expenses    = Number(r.expenses);
      const adjustments = Number(r.adjustments);
      const owner = sp?.ownerPartnerId
        ? partnerById.get(sp.ownerPartnerId) ?? null
        : null;
      const pct = sp?.partnerPaymentPercentage ?? null;
      const partnerSalary =
        pct !== null ? Math.round((billed * pct) / 100) : null;
      const net =
        billed -
        wonPrize -
        (partnerSalary ?? 0) +
        deposits -
        withdrawals -
        expenses +
        adjustments;
      return {
        salePointId:              r.sale_point_id,
        salePointName:            sp?.name ?? '—',
        ownerPartnerId:           sp?.ownerPartnerId ?? null,
        ownerPartnerName:         owner?.name ?? null,
        ownerPartnerPhone:        owner?.phone ?? null,
        partnerPaymentPercentage: pct,
        partnerSalary,
        billed,
        wonPrize,
        deposits,
        withdrawals,
        expenses,
        adjustments,
        net,
      };
    });

    items.sort((a, b) => b.net - a.net);
    return { items };
  }
}
