import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GamesModule } from '../games/games.module';
import { SalePointsModule } from '../sale-points/sale-points.module';
import { UsersModule } from '../users/users.module';
import { ListEffectiveGamePrizes } from './application/use-cases/list-effective-game-prizes.use-case';
import { UpsertSalePointGamePrize } from './application/use-cases/upsert-sale-point-game-prize.use-case';
import { SALE_POINT_GAME_PRIZES_REPOSITORY } from './domain/repositories/sale-point-game-prizes.repository';
import { GamePrizesController } from './infrastructure/http/controllers/game-prizes.controller';
import { SalePointGamePrizeOrmEntity } from './infrastructure/persistence/entities/sale-point-game-prize.orm-entity';
import { TypeOrmSalePointGamePrizesRepository } from './infrastructure/persistence/repositories/typeorm-sale-point-game-prizes.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalePointGamePrizeOrmEntity]),
    GamesModule,
    SalePointsModule,
    UsersModule,
  ],
  controllers: [GamePrizesController],
  providers: [
    {
      provide: SALE_POINT_GAME_PRIZES_REPOSITORY,
      useClass: TypeOrmSalePointGamePrizesRepository,
    },
    ListEffectiveGamePrizes,
    UpsertSalePointGamePrize,
  ],
  exports: [SALE_POINT_GAME_PRIZES_REPOSITORY],
})
export class GamePrizesModule {}
