import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class BillingByGameQueryDto {
  @IsOptional()
  @IsUUID()
  salePointId?: string;

  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
