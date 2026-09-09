import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import type { SaleLimitBySellerNumber } from '../../../domain/entities/sale-limit-by-seller-number.entity';
import type { SaleLimitsBySellerNumberRepository } from '../../../domain/repositories/sale-limits-by-seller-number.repository';
import { SaleLimitBySellerNumberOrmEntity } from '../entities/sale-limit-by-seller-number.orm-entity';
import { SaleLimitBySellerNumberMapper } from '../mappers/sale-limit-by-seller-number.mapper';

@Injectable()
export class TypeOrmSaleLimitsBySellerNumberRepository
  implements SaleLimitsBySellerNumberRepository
{
  constructor(
    @InjectRepository(SaleLimitBySellerNumberOrmEntity)
    private readonly repo: Repository<SaleLimitBySellerNumberOrmEntity>,
  ) {}

  async save(entity: SaleLimitBySellerNumber): Promise<void> {
    await this.repo.save(SaleLimitBySellerNumberMapper.toOrm(entity));
  }

  async findById(id: string): Promise<SaleLimitBySellerNumber | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? SaleLimitBySellerNumberMapper.toDomain(row) : null;
  }

  async findBySalePoint(
    salePointId: string,
    gameId?: string,
  ): Promise<SaleLimitBySellerNumber[]> {
    const rows = await this.repo.find({
      where: gameId ? { salePointId, gameId } : { salePointId },
      order: { gameId: 'ASC', label: 'ASC', sellerId: 'ASC' },
    });
    return rows.map(SaleLimitBySellerNumberMapper.toDomain);
  }

  async findByKey(
    sellerId: string,
    gameId: string,
    label: string,
  ): Promise<SaleLimitBySellerNumber | null> {
    const row = await this.repo.findOne({
      where: { sellerId, gameId, label },
    });
    return row ? SaleLimitBySellerNumberMapper.toDomain(row) : null;
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  async quotasFor(
    salePointId: string,
    gameId: string,
    label: string,
  ): Promise<Map<string, number>> {
    const rows = await this.repo.find({
      where: { salePointId, gameId, label },
      select: { sellerId: true, amount: true },
    });
    return new Map(rows.map((r) => [r.sellerId, r.amount]));
  }

  async findQuotaForSeller(
    sellerId: string,
    gameId: string,
    label: string,
  ): Promise<number | null> {
    const row = await this.repo.findOne({
      where: { sellerId, gameId, label },
      select: { amount: true },
    });
    return row ? row.amount : null;
  }

  async quotasForLabels(
    salePointId: string,
    gameId: string,
    labels: string[],
  ): Promise<Map<string, Map<string, number>>> {
    const result = new Map<string, Map<string, number>>();
    for (const label of labels) result.set(label, new Map());
    if (labels.length === 0) return result;

    const rows = await this.repo.find({
      where: { salePointId, gameId, label: In(labels) },
      select: { sellerId: true, label: true, amount: true },
    });
    for (const r of rows) {
      result.get(r.label)!.set(r.sellerId, r.amount);
    }
    return result;
  }
}
