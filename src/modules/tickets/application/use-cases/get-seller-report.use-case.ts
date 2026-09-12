import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import type { UseCase } from '../../../../shared/application/use-case';
import { PartnerScopeService } from '../../../sale-points/application/services/partner-scope.service';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../../../users/domain/repositories/users.repository';
import { UserRole } from '../../../users/domain/value-objects/user-role';
import type {
  SellerReportOutput,
  SellerReportRow,
} from '../dtos/seller-report.output';

export interface GetSellerReportInput {
  requesterId: string;
  requesterRole: UserRole;
  salePointId?: string;
  /** Multi-sucursal. Se intersecta con el partner scope antes de aplicar. */
  salePointIds?: string[];
  sellerId?: string;
  gameId?: string;
  /** "HH:MM" wall-clock en zona Managua. */
  drawTime?: string;
  from?: Date;
  to?: Date;
}

interface RawRow {
  seller_id: string;
  ticket_count: string;
  voided_count: string;
  billed: string;
  won_prize: string;
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
 * Per-seller aggregates for the "Reporte Diario del Vendedor" page:
 * how much each seller billed, how much was paid out on their winning
 * tickets, how much they SHOULD pay (wonPrize includes unpaid winnings),
 * and their weekly commission based on `paymentPercentage`.
 *
 * All prize computation runs in SQL (PRIZE_SQL via won_flow CTE) — no
 * tickets are loaded into Node.js memory. A single round-trip returns
 * billed + won_prize together.
 */
@Injectable()
export class GetSellerReport
  implements UseCase<GetSellerReportInput, SellerReportOutput>
{
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    private readonly scope: PartnerScopeService,
  ) {}

  async execute(
    input: GetSellerReportInput,
  ): Promise<SellerReportOutput> {
    // Sellers can only see their own row.
    const effectiveSellerId =
      input.requesterRole === UserRole.SELLER
        ? input.requesterId
        : input.sellerId;

    const partnerScope = await this.scope.getAccessibleSalePointIds(
      input.requesterId,
      input.requesterRole,
    );
    if (partnerScope.length === 0) return { items: [] };

    // Intersecta el filtro multi-sucursal con el scope autorizado.
    const effectiveScope =
      input.salePointIds && input.salePointIds.length > 0
        ? partnerScope.filter((id) => input.salePointIds!.includes(id))
        : partnerScope;
    if (effectiveScope.length === 0) return { items: [] };

    // Single CTE round-trip: billed counts AND wonPrize together.
    //
    // ticket_flow — aggregates per seller (valid + voided).
    // won_flow    — prizes won in SQL (PRIZE_SQL), valid tickets with
    //               executed draws only (INNER JOIN draw_results).
    //
    // Parameters: $1=sellerId, $2=salePointId, $3=from, $4=to,
    //             $5=effectiveScope, $6=gameId, $7=drawTime
    const rows = await this.dataSource.query<RawRow[]>(
      `
      WITH
        ticket_flow AS (
          SELECT
            t.seller_id::text AS seller_id,
            COALESCE(SUM(CASE WHEN t.status = 'valid'  THEN 1 ELSE 0 END), 0)::bigint AS ticket_count,
            COALESCE(SUM(CASE WHEN t.status = 'voided' THEN 1 ELSE 0 END), 0)::bigint AS voided_count,
            COALESCE(SUM(CASE WHEN t.status = 'valid'  THEN t.total ELSE 0 END), 0)::bigint AS billed
          FROM tickets t
          WHERE ($1::uuid IS NULL OR t.seller_id     = $1::uuid)
            AND ($2::uuid IS NULL OR t.sale_point_id = $2::uuid)
            AND ($3::timestamptz IS NULL OR t.created_at >= $3::timestamptz)
            AND ($4::timestamptz IS NULL OR t.created_at <  $4::timestamptz)
            AND t.sale_point_id = ANY($5::uuid[])
            AND ($6::uuid IS NULL OR t.game_id = $6::uuid)
            AND ($7::text IS NULL OR to_char(t.draw_at AT TIME ZONE 'America/Managua', 'HH24:MI') = $7::text)
          GROUP BY t.seller_id
        ),
        won_flow AS (
          SELECT
            t.seller_id::text AS seller_id,
            SUM(${PRIZE_SQL})  AS won_prize
          FROM tickets t
          JOIN games g         ON g.id         = t.game_id
          JOIN ticket_lines tl ON tl.ticket_id = t.id
          JOIN draw_results dr
            ON dr.game_id = t.game_id AND dr.draw_at = t.draw_at
          WHERE t.status = 'valid'
            AND ($1::uuid IS NULL OR t.seller_id     = $1::uuid)
            AND ($2::uuid IS NULL OR t.sale_point_id = $2::uuid)
            AND ($3::timestamptz IS NULL OR t.created_at >= $3::timestamptz)
            AND ($4::timestamptz IS NULL OR t.created_at <  $4::timestamptz)
            AND t.sale_point_id = ANY($5::uuid[])
            AND ($6::uuid IS NULL OR t.game_id = $6::uuid)
            AND ($7::text IS NULL OR to_char(t.draw_at AT TIME ZONE 'America/Managua', 'HH24:MI') = $7::text)
          GROUP BY t.seller_id
        )
      SELECT
        tf.seller_id,
        tf.ticket_count,
        tf.voided_count,
        tf.billed,
        COALESCE(wf.won_prize, 0)::bigint AS won_prize
      FROM ticket_flow tf
      LEFT JOIN won_flow wf ON wf.seller_id = tf.seller_id
      `,
      [
        effectiveSellerId ?? null,
        input.salePointId ?? null,
        input.from ?? null,
        input.to ?? null,
        effectiveScope,
        input.gameId ?? null,
        input.drawTime ?? null,
      ],
    );

    // Lista base de vendedores según los filtros — incluye a los que no
    // vendieron nada en el rango, para que aparezcan en ceros en la UI.
    const sellers = await this.resolveSellerScope({
      effectiveSellerId,
      salePointId: input.salePointId,
      salePointIds: effectiveScope,
    });

    if (sellers.length === 0) return { items: [] };

    const rowBySellerId = new Map(rows.map((r) => [r.seller_id, r]));

    const items: SellerReportRow[] = sellers.map((seller) => {
      const r = rowBySellerId.get(seller.id);
      const billed = r ? Number(r.billed) : 0;
      const pct = seller.paymentPercentage ?? null;
      const salary = pct !== null ? Math.round((billed * pct) / 100) : null;
      return {
        sellerId: seller.id,
        sellerName: seller.name,
        sellerPhone: seller.phone,
        ticketCount: r ? Number(r.ticket_count) : 0,
        voidedCount: r ? Number(r.voided_count) : 0,
        billed,
        wonPrize: r ? Number(r.won_prize) : 0,
        paymentPercentage: pct,
        salary,
      };
    });

    // Sort by billed desc — highest earners first.
    items.sort((a, b) => b.billed - a.billed);

    return { items };
  }

  /**
   * Lista de vendedores que deben aparecer en el reporte, incluyendo los
   * que no vendieron nada en el rango. Aplica los mismos scopes que las
   * queries de tickets (partner, sucursal, seller específico) para no
   * mostrar vendedores fuera del alcance del requester.
   */
  private async resolveSellerScope(filters: {
    effectiveSellerId?: string;
    salePointId?: string;
    salePointIds: string[];
  }) {
    if (filters.effectiveSellerId) {
      const one = await this.users.findById(filters.effectiveSellerId);
      if (!one || !one.isActive) return [];
      if (filters.salePointId && one.salePointId !== filters.salePointId) {
        return [];
      }
      if (
        one.salePointId === null ||
        !filters.salePointIds.includes(one.salePointId)
      ) {
        return [];
      }
      return [one];
    }

    if (filters.salePointId) {
      if (!filters.salePointIds.includes(filters.salePointId)) return [];
      return this.users.findMany({
        role: UserRole.SELLER,
        salePointIds: [filters.salePointId],
        isActive: true,
        limit: 1000,
        offset: 0,
      });
    }

    if (filters.salePointIds.length === 0) return [];
    return this.users.findMany({
      role: UserRole.SELLER,
      salePointIds: filters.salePointIds,
      isActive: true,
      limit: 1000,
      offset: 0,
    });
  }
}
