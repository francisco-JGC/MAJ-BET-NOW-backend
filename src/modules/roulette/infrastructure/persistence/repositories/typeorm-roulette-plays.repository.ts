import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RoulettePlay } from '../../../domain/entities/roulette-play.entity';
import type {
  ListRoulettePlaysFilter,
  RoulettePlaysRepository,
  RoulettePlayTotals,
} from '../../../domain/repositories/roulette-plays.repository';
import { RoulettePlayOrmEntity } from '../entities/roulette-play.orm-entity';
import { RoulettePlayMapper } from '../mappers/roulette.mapper';

@Injectable()
export class TypeOrmRoulettePlaysRepository implements RoulettePlaysRepository {
  constructor(
    @InjectRepository(RoulettePlayOrmEntity)
    private readonly repo: Repository<RoulettePlayOrmEntity>,
  ) {}

  async save(play: RoulettePlay): Promise<void> {
    await this.repo.save(RoulettePlayMapper.toOrm(play));
  }

  async list(
    filter: ListRoulettePlaysFilter,
  ): Promise<{ items: RoulettePlay[]; total: number }> {
    const qb = this.baseQuery(filter);
    const [rows, total] = await qb
      .orderBy('p.created_at', 'DESC')
      .take(filter.limit)
      .skip(filter.offset)
      .getManyAndCount();
    return { items: rows.map(RoulettePlayMapper.toDomain), total };
  }

  async totals(
    filter: Omit<ListRoulettePlaysFilter, 'limit' | 'offset'>,
  ): Promise<RoulettePlayTotals> {
    const row = await this.baseQuery(filter)
      .select('COUNT(*)', 'plays')
      .addSelect('COUNT(*) FILTER (WHERE p.is_win)', 'wins')
      .addSelect('COALESCE(SUM(p.total_amount), 0)', 'wagered')
      .addSelect('COALESCE(SUM(p.prize), 0)', 'paid')
      .getRawOne<{ plays: string; wins: string; wagered: string; paid: string }>();

    return {
      plays: Number(row?.plays ?? 0),
      wins: Number(row?.wins ?? 0),
      wagered: Number(row?.wagered ?? 0),
      paid: Number(row?.paid ?? 0),
    };
  }

  private baseQuery(
    filter: Omit<ListRoulettePlaysFilter, 'limit' | 'offset'>,
  ) {
    const qb = this.repo.createQueryBuilder('p');
    // Lista vacía != sin filtro. Un socio sin sucursales accesibles no debe
    // ver TODAS las jugadas; debe ver ninguna.
    if (filter.salePointIds) {
      if (filter.salePointIds.length === 0) {
        qb.andWhere('1 = 0');
      } else {
        qb.andWhere('p.sale_point_id IN (:...salePointIds)', {
          salePointIds: filter.salePointIds,
        });
      }
    }
    if (filter.playerId) {
      qb.andWhere('p.player_id = :playerId', { playerId: filter.playerId });
    }
    if (filter.from) {
      qb.andWhere('p.created_at >= :from', { from: filter.from });
    }
    if (filter.to) {
      qb.andWhere('p.created_at <= :to', { to: filter.to });
    }
    return qb;
  }
}
