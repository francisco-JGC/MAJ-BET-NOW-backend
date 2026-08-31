import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';

import { SeedInitialGames } from '../../application/use-cases/seed-initial-games.use-case';
import { SeedInitialSchedules } from '../../application/use-cases/seed-initial-schedules.use-case';

@Injectable()
export class GamesBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(GamesBootstrapService.name);

  constructor(
    private readonly seedInitialGames: SeedInitialGames,
    private readonly seedInitialSchedules: SeedInitialSchedules,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const seededGames = await this.seedInitialGames.execute();
    if (seededGames === 0) {
      this.logger.log('Games already seeded, skipping');
    }
    const seededSchedules = await this.seedInitialSchedules.execute();
    if (seededSchedules === 0) {
      this.logger.log('Draw schedules already seeded, skipping');
    }
  }
}
