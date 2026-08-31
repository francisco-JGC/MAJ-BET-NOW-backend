import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class TicketsSummaryQueryDto {
  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @IsOptional()
  @IsUUID()
  salePointId?: string;

  @IsOptional()
  @IsUUID()
  gameId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
