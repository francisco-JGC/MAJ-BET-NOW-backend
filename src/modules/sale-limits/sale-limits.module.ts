import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GamesModule } from '../games/games.module';
import { SalePointsModule } from '../sale-points/sale-points.module';
import { UsersModule } from '../users/users.module';
import { DeleteSaleLimit } from './application/use-cases/delete-sale-limit.use-case';
import { GetSaleLimitAvailability } from './application/use-cases/get-sale-limit-availability.use-case';
import { ListSaleLimits } from './application/use-cases/list-sale-limits.use-case';
import { UpsertSaleLimit } from './application/use-cases/upsert-sale-limit.use-case';
import { SALE_LIMITS_REPOSITORY } from './domain/repositories/sale-limits.repository';
import { SaleLimitsController } from './infrastructure/http/controllers/sale-limits.controller';
import { SaleLimitOrmEntity } from './infrastructure/persistence/entities/sale-limit.orm-entity';
import { TypeOrmSaleLimitsRepository } from './infrastructure/persistence/repositories/typeorm-sale-limits.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([SaleLimitOrmEntity]),
    GamesModule,
    SalePointsModule,
    UsersModule,
  ],
  controllers: [SaleLimitsController],
  providers: [
    { provide: SALE_LIMITS_REPOSITORY, useClass: TypeOrmSaleLimitsRepository },
    ListSaleLimits,
    UpsertSaleLimit,
    DeleteSaleLimit,
    GetSaleLimitAvailability,
  ],
  exports: [SALE_LIMITS_REPOSITORY],
})
export class SaleLimitsModule {}
