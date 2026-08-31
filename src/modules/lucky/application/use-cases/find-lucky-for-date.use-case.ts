import { Inject, Injectable } from '@nestjs/common';

import { NotFoundError } from '../../../../shared/domain/errors/domain.error';
import {
  LUCKY_DAILIES_REPOSITORY,
  type LuckyDailiesRepository,
} from '../../domain/repositories/lucky-dailies.repository';
import { LuckyKind } from '../../domain/value-objects/lucky-kind';
import {
  toLuckyDailyOutput,
  type LuckyDailyOutput,
} from '../dtos/lucky-daily.output';
import { EnsureTodayLucky } from './ensure-today-lucky.use-case';

@Injectable()
export class FindLuckyForDate {
  constructor(
    @Inject(LUCKY_DAILIES_REPOSITORY)
    private readonly repo: LuckyDailiesRepository,
    private readonly ensureToday: EnsureTodayLucky,
  ) {}

  async execute(kind: LuckyKind, forDate: Date): Promise<LuckyDailyOutput> {
    const target = new Date(
      forDate.getFullYear(),
      forDate.getMonth(),
      forDate.getDate(),
    );
    const today = this.startOfDay(new Date());
    // If asking about today and it isn't seeded yet, do it lazily.
    if (target.getTime() === today.getTime()) {
      await this.ensureToday.execute();
    }
    const found = await this.repo.findForDate(kind, target);
    if (!found) {
      throw new NotFoundError('LuckyDaily', `${kind}@${target.toISOString()}`);
    }
    return toLuckyDailyOutput(found);
  }

  private startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
}
