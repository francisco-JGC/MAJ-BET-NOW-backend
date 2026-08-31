import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class LuckyQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class LuckyHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  limit?: number;
}
