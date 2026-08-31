import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { Game } from '../../../domain/entities/game.entity';
import type { GamesRepository } from '../../../domain/repositories/games.repository';
import { GameOrmEntity } from '../entities/game.orm-entity';
import { GameMapper } from '../mappers/game.mapper';

@Injectable()
export class TypeOrmGamesRepository implements GamesRepository {
  constructor(
    @InjectRepository(GameOrmEntity)
    private readonly repo: Repository<GameOrmEntity>,
  ) {}

  async save(game: Game): Promise<void> {
    await this.repo.save(GameMapper.toOrm(game));
  }

  async findById(id: string): Promise<Game | null> {
    const found = await this.repo.findOne({ where: { id } });
    return found ? GameMapper.toDomain(found) : null;
  }

  async findBySlug(slug: string): Promise<Game | null> {
    const found = await this.repo.findOne({ where: { slug } });
    return found ? GameMapper.toDomain(found) : null;
  }

  async findAll(options: { onlyActive: boolean }): Promise<Game[]> {
    const rows = await this.repo.find({
      where: options.onlyActive ? { isActive: true } : undefined,
      order: { orderIndex: 'ASC' },
    });
    return rows.map((row) => GameMapper.toDomain(row));
  }

  count(): Promise<number> {
    return this.repo.count();
  }
}
