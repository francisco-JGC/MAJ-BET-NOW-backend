import { IsOptional, IsUUID } from 'class-validator';

export class ListSaleLimitsBySellerNumberQueryDto {
  @IsUUID()
  salePointId!: string;

  @IsOptional()
  @IsUUID()
  gameId?: string;
}
