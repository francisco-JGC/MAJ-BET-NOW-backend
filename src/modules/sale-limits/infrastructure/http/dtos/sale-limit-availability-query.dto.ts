import { IsDateString, IsNotEmpty, IsUUID } from 'class-validator';

export class SaleLimitAvailabilityQueryDto {
  @IsNotEmpty()
  @IsUUID()
  gameId!: string;

  @IsNotEmpty()
  @IsUUID()
  salePointId!: string;

  @IsNotEmpty()
  @IsDateString()
  drawAt!: string;
}
