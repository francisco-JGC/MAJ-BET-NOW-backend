import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BUSINESS_TZ } from '../../../../../shared/domain/business-time';
import type { DrawResult } from '../../../domain/entities/draw-result.entity';
import type {
  DrawResultsFilters,
  DrawResultsRepository,
} from '../../../domain/repositories/draw-results.repository';
import { DrawResultOrmEntity } from '../entities/draw-result.orm-entity';
import { DrawResultMapper } from '../mappers/draw-result.mapper';

@Injectable()
export class TypeOrmDrawResultsRepository implements DrawResultsRepository {
  constructor(
    @InjectRepository(DrawResultOrmEntity)
    private readonly repo: Repository<DrawResultOrmEntity>,
  ) {}

  async save(result: DrawResult): Promise<void> {
    await this.repo.save(DrawResultMapper.toOrm(result));
  }

  async findById(id: string): Promise<DrawResult | null> {
    const found = await this.repo.findOne({ where: { id } });
    return found ? DrawResultMapper.toDomain(found) : null;
  }

  async findByGameAndDraw(
    gameId: string,
    drawAt: Date,
  ): Promise<DrawResult | null> {
    const found = await this.repo.findOne({ where: { gameId, drawAt } });
    return found ? DrawResultMapper.toDomain(found) : null;
  }

  async findMany(filters: DrawResultsFilters): Promise<DrawResult[]> {
    // Raw SQL so we can:
    //   1) sort by (day desc in BUSINESS_TZ, game.order_index asc, drawAt asc)
    //      — grouping all Diaria draws together, then Juega 3, etc.
    //   2) avoid TypeORM's fragile placeholder handling inside ORDER BY.
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filters.gameId) {
      params.push(filters.gameId);
      conditions.push(`dr.game_id = $${params.length}::uuid`);
    }
    if (filters.from) {
      params.push(filters.from);
      conditions.push(`dr.draw_at >= $${params.length}::timestamptz`);
    }
    if (filters.to) {
      params.push(filters.to);
      conditions.push(`dr.draw_at <= $${params.length}::timestamptz`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    let limitClause = '';
    if (filters.limit !== undefined) {
      params.push(filters.limit);
      limitClause = ` LIMIT $${params.length}`;
    }
    let offsetClause = '';
    if (filters.offset !== undefined) {
      params.push(filters.offset);
      offsetClause = ` OFFSET $${params.length}`;
    }

    const rows = await this.repo.query<
      Array<{
        id: string;
        game_id: string;
        draw_at: Date;
        winning_number: string;
        recorded_by_id: string;
        created_at: Date;
        updated_at: Date;
      }>
    >(
      `
      SELECT
        dr.id,
        dr.game_id,
        dr.draw_at,
        dr.winning_number,
        dr.recorded_by_id,
        dr.created_at,
        dr.updated_at
      FROM draw_results dr
      INNER JOIN games g ON g.id = dr.game_id
      ${where}
      ORDER BY (dr.draw_at AT TIME ZONE '${BUSINESS_TZ}')::date DESC,
               g.order_index ASC,
               dr.draw_at ASC
      ${limitClause}${offsetClause}
      `,
      params,
    );

    return rows.map((row) =>
      DrawResultMapper.toDomain({
        id: row.id,
        gameId: row.game_id,
        drawAt: row.draw_at,
        winningNumber: row.winning_number,
        recordedById: row.recorded_by_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } as DrawResultOrmEntity),
    );
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
