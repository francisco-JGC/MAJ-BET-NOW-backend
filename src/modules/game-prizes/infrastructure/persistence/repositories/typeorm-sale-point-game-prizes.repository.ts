import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { SalePointGamePrize } from '../../../domain/entities/sale-point-game-prize.entity';
import type { SalePointGamePrizesRepository } from '../../../domain/repositories/sale-point-game-prizes.repository';
import { SalePointGamePrizeOrmEntity } from '../entities/sale-point-game-prize.orm-entity';
import { SalePointGamePrizeMapper } from '../mappers/sale-point-game-prize.mapper';

@Injectable()
export class TypeOrmSalePointGamePrizesRepository
  implements SalePointGamePrizesRepository
{
  constructor(
    @InjectRepository(SalePointGamePrizeOrmEntity)
    private readonly repo: Repository<SalePointGamePrizeOrmEntity>,
  ) {}

  async save(prize: SalePointGamePrize): Promise<void> {
    await this.repo.save(SalePointGamePrizeMapper.toOrm(prize));
  }

  async findById(id: string): Promise<SalePointGamePrize | null> {
    const found = await this.repo.findOne({ where: { id } });
    return found ? SalePointGamePrizeMapper.toDomain(found) : null;
  }

  async findByGameAndSalePoint(
    gameId: string,
    salePointId: string,
  ): Promise<SalePointGamePrize | null> {
    const found = await this.repo.findOne({
      where: { gameId, salePointId },
    });
    return found ? SalePointGamePrizeMapper.toDomain(found) : null;
  }

  async findBySalePoint(salePointId: string): Promise<SalePointGamePrize[]> {
    const rows = await this.repo.find({ where: { salePointId } });
    return rows.map(SalePointGamePrizeMapper.toDomain);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
