import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import type { FindOptionsWhere, SelectQueryBuilder } from 'typeorm';

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

    // Always use QueryBuilder when a sale-point scope is present so that
    // seller-level movements (salePointId IS NULL) are included and correctly
    // attributed to their branch via the users table.
    if (filters.salePointId || filters.salePointIds?.length) {
      const rows = await this.buildScopedQb(filters)
        .orderBy('m.occurredAt', 'DESC')
        .take(filters.limit)
        .skip(filters.offset)
        .getMany();
      return rows.map(MovementMapper.toDomain);
    }

    const rows = await this.repo.find({
      where: this.buildWhere(filters),
      order: { occurredAt: 'DESC' },
      take: filters.limit,
      skip: filters.offset,
    });
    return rows.map(MovementMapper.toDomain);
  }

  async countMany(filters: FindMovementsFilters): Promise<number> {
    if (filters.salePointIds && filters.salePointIds.length === 0) return 0;

    if (filters.salePointId || filters.salePointIds?.length) {
      return this.buildScopedQb(filters).getCount();
    }

    return this.repo.count({ where: this.buildWhere(filters) });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  /**
   * QueryBuilder used to include seller-level movements (salePointId IS NULL)
   * attributed to their branch via the users table. Handles both exact-branch
   * (salePointId singular) and multi-branch (salePointIds array) cases.
   * Prevents partners from seeing movements from other branches.
   */
  private buildScopedQb(
    filters: FindMovementsFilters,
  ): SelectQueryBuilder<MovementOrmEntity> {
    const qb = this.repo.createQueryBuilder('m');

    if (filters.salePointId) {
      // Exact branch: direct movements + seller movements for sellers of this branch.
      qb.where(
        '(m.salePointId = :salePointId OR ' +
          '(m.salePointId IS NULL AND m.sellerId IS NOT NULL AND ' +
          'EXISTS (SELECT 1 FROM users u WHERE u.id = m.sellerId AND u.sale_point_id = :salePointId)))',
        { salePointId: filters.salePointId },
      );
    } else {
      // All accessible branches.
      qb.where(
        '(m.salePointId IN (:...salePointIds) OR ' +
          '(m.salePointId IS NULL AND m.sellerId IS NOT NULL AND ' +
          'EXISTS (SELECT 1 FROM users u WHERE u.id = m.sellerId AND u.sale_point_id IN (:...salePointIds))))',
        { salePointIds: filters.salePointIds },
      );
    }

    this.applyCommonFilters(qb, filters);
    return qb;
  }

  private applyCommonFilters(
    qb: SelectQueryBuilder<MovementOrmEntity>,
    filters: FindMovementsFilters,
  ): void {
    if (filters.type) {
      qb.andWhere('m.type = :type', { type: filters.type });
    }
    if (filters.sellerId) {
      qb.andWhere('m.sellerId = :sellerId', { sellerId: filters.sellerId });
    }
    if (filters.from && filters.to) {
      qb.andWhere('m.occurredAt BETWEEN :from AND :to', {
        from: filters.from,
        to: filters.to,
      });
    } else if (filters.from) {
      qb.andWhere('m.occurredAt >= :from', { from: filters.from });
    } else if (filters.to) {
      qb.andWhere('m.occurredAt <= :to', { to: filters.to });
    }
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
      return { ...base, salePointId: filters.salePointId };
    }

    // When filtering by seller only, skip salePointId scoping entirely.
    if (filters.sellerId) {
      return base;
    }

    if (filters.salePointIds && filters.salePointIds.length > 0) {
      return { ...base, salePointId: In(filters.salePointIds) };
    }

    return base;
  }
}
