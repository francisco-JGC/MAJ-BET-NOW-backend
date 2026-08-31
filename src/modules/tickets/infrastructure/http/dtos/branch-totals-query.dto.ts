import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class BranchTotalsQueryDto {
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
