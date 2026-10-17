import type { RouletteConfig } from '../entities/roulette-config.entity';

export const ROULETTE_CONFIGS_REPOSITORY = Symbol('ROULETTE_CONFIGS_REPOSITORY');

export interface RouletteConfigsRepository {
  /** Config de una sucursal, o la global si `salePointId` es null. */
  findBySalePoint(salePointId: string | null): Promise<RouletteConfig | null>;
  findAll(): Promise<RouletteConfig[]>;
  save(config: RouletteConfig): Promise<void>;
}
