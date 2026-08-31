import { Type } from 'class-transformer';
import { IsInt, IsUUID, Min } from 'class-validator';

export class UpsertSaleLimitHttpDto {
  @IsUUID()
  gameId!: string;

  @IsUUID()
  salePointId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount!: number;
}
