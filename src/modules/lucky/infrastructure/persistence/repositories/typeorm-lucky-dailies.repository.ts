import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { LuckyDaily } from '../../../domain/entities/lucky-daily.entity';
import type { LuckyDailiesRepository } from '../../../domain/repositories/lucky-dailies.repository';
import { LuckyKind } from '../../../domain/value-objects/lucky-kind';
import { LuckyDailyOrmEntity } from '../entities/lucky-daily.orm-entity';
import { LuckyDailyMapper } from '../mappers/lucky-daily.mapper';

@Injectable()
export class TypeOrmLuckyDailiesRepository
  implements LuckyDailiesRepository
{
  constructor(
    @InjectRepository(LuckyDailyOrmEntity)
    private readonly repo: Repository<LuckyDailyOrmEntity>,
  ) {}

  async save(entry: LuckyDaily): Promise<void> {
    await this.repo.save(LuckyDailyMapper.toOrm(entry));
  }

  async findForDate(
    kind: LuckyKind,
    forDate: Date,
  ): Promise<LuckyDaily | null> {
    const forDateStr = this.formatDate(forDate);
    const found = await this.repo.findOne({
      where: { kind, forDate: forDateStr },
    });
    return found ? LuckyDailyMapper.toDomain(found) : null;
  }

  async findHistory(kind: LuckyKind, limit: number): Promise<LuckyDaily[]> {
    const rows = await this.repo.find({
      where: { kind },
      order: { forDate: 'DESC' },
      take: limit,
    });
    return rows.map(LuckyDailyMapper.toDomain);
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
