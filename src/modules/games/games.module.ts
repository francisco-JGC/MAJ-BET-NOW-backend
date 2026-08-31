import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CreateDrawResult } from './application/use-cases/create-draw-result.use-case';
import { CreateDrawSchedule } from './application/use-cases/create-draw-schedule.use-case';
import { CreateGame } from './application/use-cases/create-game.use-case';
import { DeleteDrawResult } from './application/use-cases/delete-draw-result.use-case';
import { DeleteDrawSchedule } from './application/use-cases/delete-draw-schedule.use-case';
import { FindGameBySlug } from './application/use-cases/find-game-by-slug.use-case';
import { ListDrawResults } from './application/use-cases/list-draw-results.use-case';
import { ListDrawSchedules } from './application/use-cases/list-draw-schedules.use-case';
import { ListGames } from './application/use-cases/list-games.use-case';
import { ResolveNextDraw } from './application/use-cases/resolve-next-draw.use-case';
import { SeedInitialGames } from './application/use-cases/seed-initial-games.use-case';
import { SeedInitialSchedules } from './application/use-cases/seed-initial-schedules.use-case';
import { ToggleGame } from './application/use-cases/toggle-game.use-case';
import { UpdateDrawResult } from './application/use-cases/update-draw-result.use-case';
import { UpdateDrawSchedule } from './application/use-cases/update-draw-schedule.use-case';
import { UpdateGame } from './application/use-cases/update-game.use-case';
import { DRAW_RESULTS_REPOSITORY } from './domain/repositories/draw-results.repository';
import { DRAW_SCHEDULES_REPOSITORY } from './domain/repositories/draw-schedules.repository';
import { GAMES_REPOSITORY } from './domain/repositories/games.repository';
import { GamesBootstrapService } from './infrastructure/bootstrap/games-bootstrap.service';
import { DrawResultsController } from './infrastructure/http/controllers/draw-results.controller';
import { DrawSchedulesController } from './infrastructure/http/controllers/draw-schedules.controller';
import { GamesController } from './infrastructure/http/controllers/games.controller';
import { DrawResultOrmEntity } from './infrastructure/persistence/entities/draw-result.orm-entity';
import { DrawScheduleOrmEntity } from './infrastructure/persistence/entities/draw-schedule.orm-entity';
import { GameOrmEntity } from './infrastructure/persistence/entities/game.orm-entity';
import { TypeOrmDrawResultsRepository } from './infrastructure/persistence/repositories/typeorm-draw-results.repository';
import { TypeOrmDrawSchedulesRepository } from './infrastructure/persistence/repositories/typeorm-draw-schedules.repository';
import { TypeOrmGamesRepository } from './infrastructure/persistence/repositories/typeorm-games.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GameOrmEntity,
      DrawScheduleOrmEntity,
      DrawResultOrmEntity,
    ]),
  ],
  controllers: [
    GamesController,
    DrawSchedulesController,
    DrawResultsController,
  ],
  providers: [
    { provide: GAMES_REPOSITORY, useClass: TypeOrmGamesRepository },
    {
      provide: DRAW_SCHEDULES_REPOSITORY,
      useClass: TypeOrmDrawSchedulesRepository,
    },
    {
      provide: DRAW_RESULTS_REPOSITORY,
      useClass: TypeOrmDrawResultsRepository,
    },
    CreateGame,
    ListGames,
    FindGameBySlug,
    UpdateGame,
    ToggleGame,
    SeedInitialGames,
    SeedInitialSchedules,
    ResolveNextDraw,
    ListDrawSchedules,
    CreateDrawSchedule,
    UpdateDrawSchedule,
    DeleteDrawSchedule,
    CreateDrawResult,
    UpdateDrawResult,
    DeleteDrawResult,
    ListDrawResults,
    GamesBootstrapService,
  ],
  exports: [
    GAMES_REPOSITORY,
    DRAW_SCHEDULES_REPOSITORY,
    DRAW_RESULTS_REPOSITORY,
    FindGameBySlug,
    ResolveNextDraw,
  ],
})
export class GamesModule {}
