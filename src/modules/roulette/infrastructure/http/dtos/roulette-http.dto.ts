import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import { ROULETTE_POCKET_COUNT } from '../../../domain/value-objects/roulette-number';

export class PlayRouletteHttpDto {
  @IsUUID()
  salePointId!: string;

  /** Casillas elegidas ('0', '00', '1'..'36'). Se validan en el dominio. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ROULETTE_POCKET_COUNT)
  @IsString({ each: true })
  numbers!: string[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountPerNumber!: number;
}

export class UpsertRouletteConfigHttpDto {
  /** Ausente o null = configuración global. */
  @IsOptional()
  @IsUUID()
  salePointId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  winPercentBps?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  prizeMultiplier?: number;
}

export class ListRoulettePlaysQueryDto {
  @IsOptional()
  @IsUUID()
  salePointId?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
