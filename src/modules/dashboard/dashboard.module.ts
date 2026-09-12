import { Module } from '@nestjs/common';

import { GamesModule } from '../games/games.module';
import { SalePointsModule } from '../sale-points/sale-points.module';
import { TicketsModule } from '../tickets/tickets.module';
import { GetDashboardSummary } from './application/use-cases/get-dashboard-summary.use-case';
import { DashboardController } from './infrastructure/http/controllers/dashboard.controller';

@Module({
  imports: [TicketsModule, GamesModule, SalePointsModule],
  controllers: [DashboardController],
  providers: [GetDashboardSummary],
})
export class DashboardModule {}
