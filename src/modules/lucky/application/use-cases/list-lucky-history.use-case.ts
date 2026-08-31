import { Inject, Injectable } from '@nestjs/common';

import {
  LUCKY_DAILIES_REPOSITORY,
  type LuckyDailiesRepository,
} from '../../domain/repositories/lucky-dailies.repository';
import { LuckyKind } from '../../domain/value-objects/lucky-kind';
import {
  toLuckyDailyOutput,
  type LuckyDailyOutput,
} from '../dtos/lucky-daily.output';

@Injectable()
export class ListLuckyHistory {
  constructor(
    @Inject(LUCKY_DAILIES_REPOSITORY)
    private readonly repo: LuckyDailiesRepository,
  ) {}

  async execute(kind: LuckyKind, limit: number): Promise<LuckyDailyOutput[]> {
    const clamped = Math.max(1, Math.min(limit, 90));
    const items = await this.repo.findHistory(kind, clamped);
    return items.map(toLuckyDailyOutput);
  }
}
