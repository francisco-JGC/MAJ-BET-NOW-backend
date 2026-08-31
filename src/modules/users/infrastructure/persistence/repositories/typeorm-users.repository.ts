import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, type FindOptionsWhere, Repository } from 'typeorm';

import { User } from '../../../domain/entities/user.entity';
import type {
  FindUsersOptions,
  UsersRepository,
} from '../../../domain/repositories/users.repository';
import { UserOrmEntity } from '../entities/user.orm-entity';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class TypeOrmUsersRepository implements UsersRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repo: Repository<UserOrmEntity>,
  ) {}

  async save(user: User): Promise<void> {
    await this.repo.save(UserMapper.toOrm(user));
  }

  async findById(id: string): Promise<User | null> {
    const found = await this.repo.findOne({ where: { id } });
    return found ? UserMapper.toDomain(found) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const found = await this.repo.findOne({ where: { username } });
    return found ? UserMapper.toDomain(found) : null;
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const rows = await this.repo.find({ where: { id: In(ids) } });
    return rows.map(UserMapper.toDomain);
  }

  async findMany(options: FindUsersOptions): Promise<User[]> {
    if (options.salePointIds && options.salePointIds.length === 0) return [];
    const rows = await this.repo.find({
      where: this.buildWhere(options),
      order: { createdAt: 'DESC' },
      take: options.limit,
      skip: options.offset,
    });
    return rows.map(UserMapper.toDomain);
  }

  count(
    options: Omit<FindUsersOptions, 'limit' | 'offset'>,
  ): Promise<number> {
    if (options.salePointIds && options.salePointIds.length === 0) {
      return Promise.resolve(0);
    }
    return this.repo.count({
      where: this.buildWhere({ ...options, limit: 0, offset: 0 }),
    });
  }

  countAll(): Promise<number> {
    return this.repo.count();
  }

  private buildWhere(
    options: FindUsersOptions,
  ): FindOptionsWhere<UserOrmEntity> | FindOptionsWhere<UserOrmEntity>[] {
    const base: FindOptionsWhere<UserOrmEntity> = {};
    if (options.role) base.role = options.role;
    if (options.salePointIds && options.salePointIds.length > 0) {
      base.salePointId = In(options.salePointIds);
    }
    if (options.createdById) base.createdById = options.createdById;
    const search = options.search?.trim();
    if (!search) return base;
    // Match on either username or display name, case-insensitive.
    return [
      { ...base, name: ILike(`%${search}%`) },
      { ...base, username: ILike(`%${search}%`) },
    ];
  }
}
