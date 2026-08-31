import { IsDateString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class BranchFlowQueryDto {
  @IsNotEmpty()
  @IsUUID()
  salePointId!: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
