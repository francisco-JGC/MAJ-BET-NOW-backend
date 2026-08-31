import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import type { SaleLimit } from '../../../domain/entities/sale-limit.entity';
import type {
  FindSaleLimitsFilters,
  SaleLimitsRepository,
} from '../../../domain/repositories/sale-limits.repository';
import { SaleLimitOrmEntity } from '../entities/sale-limit.orm-entity';
import { SaleLimitMapper } from '../mappers/sale-limit.mapper';

@Injectable()
export class TypeOrmSaleLimitsRepository implements SaleLimitsRepository {
  constructor(
    @InjectRepository(SaleLimitOrmEntity)
    private readonly repo: Repository<SaleLimitOrmEntity>,
  ) {}

  async save(limit: SaleLimit): Promise<void> {
    await this.repo.save(SaleLimitMapper.toOrm(limit));
  }

  async findById(id: string): Promise<SaleLimit | null> {
    const found = await this.repo.findOne({ where: { id } });
    return found ? SaleLimitMapper.toDomain(found) : null;
  }

  async findByGameAndSalePoint(
    gameId: string,
    salePointId: string,
  ): Promise<SaleLimit | null> {
    const found = await this.repo.findOne({
      where: { gameId, salePointId },
    });
    return found ? SaleLimitMapper.toDomain(found) : null;
  }

  async findMany(filters: FindSaleLimitsFilters): Promise<SaleLimit[]> {
    if (filters.salePointIds && filters.salePointIds.length === 0) return [];
    const rows = await this.repo.find({
      where:
        filters.salePointIds && filters.salePointIds.length > 0
          ? { salePointId: In(filters.salePointIds) }
          : {},
    });
    return rows.map(SaleLimitMapper.toDomain);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
