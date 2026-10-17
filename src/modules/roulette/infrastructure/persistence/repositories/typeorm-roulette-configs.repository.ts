import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { RouletteConfig } from '../../../domain/entities/roulette-config.entity';
import type { RouletteConfigsRepository } from '../../../domain/repositories/roulette-configs.repository';
import { RouletteConfigOrmEntity } from '../entities/roulette-config.orm-entity';
import { RouletteConfigMapper } from '../mappers/roulette.mapper';

@Injectable()
export class TypeOrmRouletteConfigsRepository
  implements RouletteConfigsRepository
{
  constructor(
    @InjectRepository(RouletteConfigOrmEntity)
    private readonly repo: Repository<RouletteConfigOrmEntity>,
  ) {}

  async findBySalePoint(salePointId: string | null): Promise<RouletteConfig | null> {
    const found = await this.repo.findOne({
      // `IsNull()` y no `salePointId: null`: TypeORM traduce el null crudo
      // a `= NULL`, que en SQL nunca matchea.
      where: { salePointId: salePointId === null ? IsNull() : salePointId },
    });
    return found ? RouletteConfigMapper.toDomain(found) : null;
  }

  async findAll(): Promise<RouletteConfig[]> {
    const rows = await this.repo.find();
    return rows.map(RouletteConfigMapper.toDomain);
  }

  async save(config: RouletteConfig): Promise<void> {
    await this.repo.save(RouletteConfigMapper.toOrm(config));
  }
}
