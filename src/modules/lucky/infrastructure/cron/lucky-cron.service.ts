import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { EnsureTodayLucky } from '../../application/use-cases/ensure-today-lucky.use-case';

@Injectable()
export class LuckyCronService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LuckyCronService.name);

  constructor(private readonly ensureToday: EnsureTodayLucky) {}

  async onApplicationBootstrap(): Promise<void> {
    // Make sure today's numbers exist on startup — useful during dev
    // and after crash recovery.
    await this.ensureToday.execute();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleMidnight(): Promise<void> {
    this.logger.log('Running midnight lucky generation');
    await this.ensureToday.execute();
  }
}
