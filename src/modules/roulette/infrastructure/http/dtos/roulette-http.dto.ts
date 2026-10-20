import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import { ROULETTE_POCKET_COUNT } from '../../../domain/value-objects/roulette-number';

export class RouletteBetHttpDto {
  @IsString()
  number!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;
}

export class PlayRouletteHttpDto {
  @IsUUID()
  salePointId!: string;

  /**
   * Apuestas: cada casilla con su monto. Las casillas y los montos se
   * validan en el dominio, que es donde vive la regla.
   */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ROULETTE_POCKET_COUNT)
  @ValidateNested({ each: true })
  @Type(() => RouletteBetHttpDto)
  bets!: RouletteBetHttpDto[];

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
