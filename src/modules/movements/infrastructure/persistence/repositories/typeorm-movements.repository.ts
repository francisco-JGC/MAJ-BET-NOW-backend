import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';

import type { Movement } from '../../../domain/entities/movement.entity';
import type {
  FindMovementsFilters,
  MovementsRepository,
} from '../../../domain/repositories/movements.repository';
import { MovementOrmEntity } from '../entities/movement.orm-entity';
import { MovementMapper } from '../mappers/movement.mapper';

@Injectable()
export class TypeOrmMovementsRepository implements MovementsRepository {
  constructor(
    @InjectRepository(MovementOrmEntity)
    private readonly repo: Repository<MovementOrmEntity>,
  ) {}

  async save(movement: Movement): Promise<void> {
    await this.repo.save(MovementMapper.toOrm(movement));
  }

  async findById(id: string): Promise<Movement | null> {
    const found = await this.repo.findOne({ where: { id } });
    return found ? MovementMapper.toDomain(found) : null;
  }

  async findByClientRequestId(
    clientRequestId: string,
  ): Promise<Movement | null> {
    const found = await this.repo.findOne({ where: { clientRequestId } });
    return found ? MovementMapper.toDomain(found) : null;
  }

  async findMany(filters: FindMovementsFilters): Promise<Movement[]> {
    if (filters.salePointIds && filters.salePointIds.length === 0) return [];
    const rows = await this.repo.find({
      where: this.buildWhere(filters),
      order: { occurredAt: 'DESC' },
      take: filters.limit,
      skip: filters.offset,
    });
    return rows.map(MovementMapper.toDomain);
  }

  countMany(filters: FindMovementsFilters): Promise<number> {
    if (filters.salePointIds && filters.salePointIds.length === 0) {
      return Promise.resolve(0);
    }
    return this.repo.count({ where: this.buildWhere(filters) });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  private buildWhere(
    filters: FindMovementsFilters,
  ): FindOptionsWhere<MovementOrmEntity> | FindOptionsWhere<MovementOrmEntity>[] {
    const base: FindOptionsWhere<MovementOrmEntity> = {};
    if (filters.type) base.type = filters.type;
    if (filters.sellerId) base.sellerId = filters.sellerId;
    if (filters.from && filters.to) {
      base.occurredAt = Between(filters.from, filters.to);
    } else if (filters.from) {
      base.occurredAt = MoreThanOrEqual(filters.from);
    } else if (filters.to) {
      base.occurredAt = LessThanOrEqual(filters.to);
    }

    if (filters.salePointId) {
      // Specific sucursal filter — exact match, no NULLs.
      return { ...base, salePointId: filters.salePointId };
    }

    // When filtering by seller, skip salePointId scoping entirely.
    if (filters.sellerId) {
      return base;
    }

    if (filters.salePointIds && filters.salePointIds.length > 0) {
      if (filters.includeNullSalePoint) {
        // OR: salePointId IN (...) OR salePointId IS NULL
        return [
          { ...base, salePointId: In(filters.salePointIds) },
          { ...base, salePointId: IsNull() },
        ];
      }
      return { ...base, salePointId: In(filters.salePointIds) };
    }

    return base;
  }
}
