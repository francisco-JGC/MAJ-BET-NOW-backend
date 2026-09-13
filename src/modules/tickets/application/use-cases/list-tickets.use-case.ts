import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import type { UseCase } from '../../../../shared/application/use-case';
import {
  DRAW_RESULTS_REPOSITORY,
  type DrawResultsRepository,
} from '../../../games/domain/repositories/draw-results.repository';
import {
  GAMES_REPOSITORY,
  type GamesRepository,
} from '../../../games/domain/repositories/games.repository';
import { PartnerScopeService } from '../../../sale-points/application/services/partner-scope.service';
import { UserRole } from '../../../users/domain/value-objects/user-role';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../../../users/domain/repositories/users.repository';
import {
  TICKETS_REPOSITORY,
  type TicketsRepository,
} from '../../domain/repositories/tickets.repository';
import { TicketStatus } from '../../domain/value-objects/ticket-status';
import { toTicketOutput, type TicketOutput } from '../dtos/ticket.output';
import { TicketEvaluator } from '../services/ticket-evaluator.service';

export interface ListTicketsInput {
  requesterId: string;
  requesterRole: UserRole;
  salePointId?: string;
  gameId?: string;
  sellerId?: string;
  status?: TicketStatus;
  from?: Date;
  to?: Date;
  /** "HH:MM" wall clock in Managua tz — filter to draws at this time. */
  drawTime?: string;
  /** Búsqueda por folio (prefix) o cliente (anywhere), case-insensitive. */
  search?: string;
  /** 0-indexed page number (default 0). */
  page?: number;
  /** Items per page (default 20, max 100). */
  limit?: number;
}

export interface ListTicketsOutput {
  items: TicketOutput[];
  /** Total de registros que coinciden con los filtros (para la paginación). */
  total: number;
  /** Suma de `total` (facturado) de todos los tickets válidos del rango. */
  totalBilled: number;
  /** Suma de premios ganados de todos los tickets válidos del rango. */
  totalWonPrize: number;
}

/**
 * SQL CASE expression that replicates TicketEvaluator.evaluateWith() in the
 * database. Required aliases: tickets → t, games → g,
 * ticket_lines → tl, draw_results → dr.
 *
 * Used here only for the stats aggregation (totalWonPrize over the full
 * filtered set). The per-item wonPrize for the paginated rows is still
 * evaluated in Node.js using TicketEvaluator (only 20 items per page).
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

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class ListTickets implements UseCase<ListTicketsInput, ListTicketsOutput> {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(TICKETS_REPOSITORY) private readonly tickets: TicketsRepository,
    @Inject(DRAW_RESULTS_REPOSITORY)
    private readonly drawResults: DrawResultsRepository,
    @Inject(GAMES_REPOSITORY) private readonly games: GamesRepository,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    private readonly evaluator: TicketEvaluator,
    private readonly scope: PartnerScopeService,
  ) {}

  async execute(input: ListTicketsInput): Promise<ListTicketsOutput> {
    const pageLimit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const pageOffset = (input.page ?? 0) * pageLimit;

    const effectiveSellerId =
      input.requesterRole === UserRole.SELLER
        ? input.requesterId
        : input.sellerId;

    const accessibleSalePointIds = await this.scope.getAccessibleSalePointIds(
      input.requesterId,
      input.requesterRole,
    );
    if (accessibleSalePointIds.length === 0) {
      return { items: [], total: 0, totalBilled: 0, totalWonPrize: 0 };
    }

    // When a search term arrives we drop from/to/drawTime — a folio is
    // system-wide unique and the operator doesn't know the emission date.
    const searchTerm = input.search?.trim();
    const isSearching = !!searchTerm;

    // $1=sellerId $2=salePointId $3=scope $4=gameId $5=status
    // $6=from     $7=to          $8=drawTime        $9=search
    const statsParams = [
      effectiveSellerId ?? null,
      input.salePointId ?? null,
      accessibleSalePointIds,
      input.gameId ?? null,
      input.status ?? null,
      isSearching ? null : (input.from ?? null),
      isSearching ? null : (input.to ?? null),
      isSearching ? null : (input.drawTime ?? null),
      isSearching ? (searchTerm ?? null) : null,
    ];

    // Run the stats query and the paginated items fetch in parallel.
    // Stats (total_count, total_billed, total_won_prize) scan the full
    // filtered set entirely in PostgreSQL — no data comes to Node.js.
    // Items (findMany) returns only one page (≤ pageLimit tickets) with
    // their lines, so the TypeORM two-phase pagination fix handles it fine.
    const [statsRows, tickets] = await Promise.all([
      this.dataSource.query<
        [{ total_count: string; total_billed: string; total_won_prize: string }]
      >(
        `
        WITH filtered AS MATERIALIZED (
          SELECT t.id, t.status, t.total, t.game_id, t.draw_at
          FROM tickets t
          WHERE ($1::uuid IS NULL OR t.seller_id     = $1::uuid)
            AND ($2::uuid IS NULL OR t.sale_point_id = $2::uuid)
            AND t.sale_point_id = ANY($3::uuid[])
            AND ($4::uuid IS NULL OR t.game_id       = $4::uuid)
            AND ($5::text IS NULL OR t.status        = $5::text)
            AND ($6::timestamptz IS NULL OR t.created_at >= $6::timestamptz)
            AND ($7::timestamptz IS NULL OR t.created_at <  $7::timestamptz)
            AND ($8::text IS NULL OR
                 to_char(t.draw_at AT TIME ZONE 'America/Managua', 'HH24:MI') = $8::text)
            AND ($9::text IS NULL OR
                 t.folio  ILIKE ($9 || '%') OR
                 t.client ILIKE ('%' || $9 || '%'))
        )
        SELECT
          (SELECT COUNT(*)::bigint          FROM filtered)                           AS total_count,
          COALESCE(
            (SELECT SUM(total)::bigint      FROM filtered WHERE status = 'valid'), 0) AS total_billed,
          COALESCE(
            (SELECT SUM(${PRIZE_SQL})::bigint
             FROM filtered f
             JOIN tickets t  ON t.id          = f.id
             JOIN games   g  ON g.id          = t.game_id
             JOIN ticket_lines tl ON tl.ticket_id = t.id
             JOIN draw_results dr ON dr.game_id   = t.game_id
                               AND dr.draw_at     = t.draw_at
             WHERE f.status = 'valid'), 0)                                           AS total_won_prize
        `,
        statsParams,
      ),

      this.tickets.findMany({
        sellerId: effectiveSellerId,
        salePointId: input.salePointId,
        salePointIds: accessibleSalePointIds,
        gameId: input.gameId,
        status: input.status,
        from: isSearching ? undefined : input.from,
        to: isSearching ? undefined : input.to,
        drawTime: isSearching ? undefined : input.drawTime,
        search: isSearching ? searchTerm : undefined,
        limit: pageLimit,
        offset: pageOffset,
      }),
    ]);

    const stats = statsRows[0] ?? {
      total_count: '0',
      total_billed: '0',
      total_won_prize: '0',
    };

    if (tickets.length === 0) {
      return {
        items: [],
        total: Number(stats.total_count),
        totalBilled: Number(stats.total_billed),
        totalWonPrize: Number(stats.total_won_prize),
      };
    }

    // For the ≤ pageLimit items: resolve draw results and seller names.
    // With at most `pageLimit` tickets, unique pairs are tiny — no N+1 concern.
    const uniquePairs = new Map<string, { gameId: string; drawAt: Date }>();
    for (const ticket of tickets) {
      const key = `${ticket.gameId}|${ticket.drawAt.toISOString()}`;
      if (!uniquePairs.has(key)) {
        uniquePairs.set(key, { gameId: ticket.gameId, drawAt: ticket.drawAt });
      }
    }
    const uniqueSellerIds = [...new Set(tickets.map((t) => t.sellerId))];

    const [drawByKey, gamesAll, sellersAll] = await Promise.all([
      Promise.all(
        Array.from(uniquePairs.entries()).map(async ([key, pair]) => {
          const result = await this.drawResults.findByGameAndDraw(
            pair.gameId,
            pair.drawAt,
          );
          return [key, result] as const;
        }),
      ).then((entries) => new Map(entries)),
      this.games.findAll({ onlyActive: false }),
      this.users.findByIds(uniqueSellerIds),
    ]);

    const gameById = new Map(gamesAll.map((g) => [g.id, g]));
    const sellerNameById = new Map(sellersAll.map((u) => [u.id, u.name]));

    const items: TicketOutput[] = tickets.map((ticket) => {
      const isValid = ticket.status === TicketStatus.VALID;
      const key = `${ticket.gameId}|${ticket.drawAt.toISOString()}`;
      const draw = drawByKey.get(key) ?? null;
      const game = gameById.get(ticket.gameId) ?? null;
      const evaluation = this.evaluator.evaluateWith(ticket, game, draw);
      const wonForItem = isValid ? evaluation.totalPrize : 0;
      return toTicketOutput(
        ticket,
        draw !== null,
        wonForItem,
        null,
        sellerNameById.get(ticket.sellerId) ?? null,
      );
    });

    return {
      items,
      total: Number(stats.total_count),
      totalBilled: Number(stats.total_billed),
      totalWonPrize: Number(stats.total_won_prize),
    };
  }
}
