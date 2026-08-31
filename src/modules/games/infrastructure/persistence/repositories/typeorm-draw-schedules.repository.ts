import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { DrawSchedule } from '../../../domain/entities/draw-schedule.entity';
import type { DrawSchedulesRepository } from '../../../domain/repositories/draw-schedules.repository';
import { DrawScheduleOrmEntity } from '../entities/draw-schedule.orm-entity';
import { DrawScheduleMapper } from '../mappers/draw-schedule.mapper';

@Injectable()
export class TypeOrmDrawSchedulesRepository implements DrawSchedulesRepository {
  constructor(
    @InjectRepository(DrawScheduleOrmEntity)
    private readonly repo: Repository<DrawScheduleOrmEntity>,
  ) {}

  async save(schedule: DrawSchedule): Promise<void> {
    await this.repo.save(DrawScheduleMapper.toOrm(schedule));
  }

  async findById(id: string): Promise<DrawSchedule | null> {
    const found = await this.repo.findOne({ where: { id } });
    return found ? DrawScheduleMapper.toDomain(found) : null;
  }

  async findByGameId(gameId: string): Promise<DrawSchedule[]> {
    const rows = await this.repo.find({
      where: { gameId },
      order: { drawTime: 'ASC' },
    });
    return rows.map((row) => DrawScheduleMapper.toDomain(row));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  count(): Promise<number> {
    return this.repo.count();
  }
}
