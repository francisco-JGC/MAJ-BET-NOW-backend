import { Module } from '@nestjs/common';

import { SalePointsModule } from '../sale-points/sale-points.module';
import { GetDashboardSummary } from './application/use-cases/get-dashboard-summary.use-case';
import { DashboardController } from './infrastructure/http/controllers/dashboard.controller';

@Module({
  imports: [SalePointsModule],
  controllers: [DashboardController],
  providers: [GetDashboardSummary],
})
export class DashboardModule {}
