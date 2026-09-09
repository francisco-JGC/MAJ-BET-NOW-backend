import { IsOptional, IsUUID } from 'class-validator';

export class ListSaleLimitsByNumberQueryDto {
  @IsUUID()
  salePointId!: string;

  @IsOptional()
  @IsUUID()
  gameId?: string;
}
