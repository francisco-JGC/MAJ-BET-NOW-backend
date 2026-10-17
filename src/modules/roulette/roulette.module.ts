import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GamesModule } from '../games/games.module';
import { SalePointsModule } from '../sale-points/sale-points.module';
import { TicketsModule } from '../tickets/tickets.module';
import { UsersModule } from '../users/users.module';
import { RouletteAccounting } from './application/services/roulette-accounting.service';
import { SpinResolver } from './application/services/spin-resolver.service';
import { ListRoulettePlays } from './application/use-cases/list-roulette-plays.use-case';
import { PlayRoulette } from './application/use-cases/play-roulette.use-case';
import { ResolveRouletteConfig } from './application/use-cases/resolve-roulette-config.use-case';
import { UpsertRouletteConfig } from './application/use-cases/upsert-roulette-config.use-case';
import { ROULETTE_CONFIGS_REPOSITORY } from './domain/repositories/roulette-configs.repository';
import { ROULETTE_PLAYS_REPOSITORY } from './domain/repositories/roulette-plays.repository';
import { RouletteController } from './infrastructure/http/controllers/roulette.controller';
import { RouletteConfigOrmEntity } from './infrastructure/persistence/entities/roulette-config.orm-entity';
import { RoulettePlayOrmEntity } from './infrastructure/persistence/entities/roulette-play.orm-entity';
import { TypeOrmRouletteConfigsRepository } from './infrastructure/persistence/repositories/typeorm-roulette-configs.repository';
import { TypeOrmRoulettePlaysRepository } from './infrastructure/persistence/repositories/typeorm-roulette-plays.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([RouletteConfigOrmEntity, RoulettePlayOrmEntity]),
    SalePointsModule,
    UsersModule,
    GamesModule,
    TicketsModule,
  ],
  controllers: [RouletteController],
  providers: [
    { provide: ROULETTE_CONFIGS_REPOSITORY, useClass: TypeOrmRouletteConfigsRepository },
    { provide: ROULETTE_PLAYS_REPOSITORY, useClass: TypeOrmRoulettePlaysRepository },
    SpinResolver,
    RouletteAccounting,
    ResolveRouletteConfig,
    PlayRoulette,
    ListRoulettePlays,
    UpsertRouletteConfig,
  ],
  exports: [ROULETTE_PLAYS_REPOSITORY, ROULETTE_CONFIGS_REPOSITORY],
})
export class RouletteModule {}
