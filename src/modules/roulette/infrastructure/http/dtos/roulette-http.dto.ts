import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
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

  /**
   * Tirada de prueba. Solo se respeta si la sucursal tiene el modo
   * habilitado; si no, el servidor la trata como real.
   */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isTest?: boolean;
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

  /** Modo prueba: las tiradas no generan ticket ni sorteo. */
  @IsOptional()
  @IsBoolean()
  testMode?: boolean;
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

  /**
   * Incluir las tiradas de prueba. Solo tiene efecto para admin: un
   * vendedor no debería poder listar lo que no cuenta como venta.
   */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeTest?: boolean;
}
