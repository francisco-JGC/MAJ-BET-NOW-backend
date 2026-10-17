import { Inject, Injectable } from '@nestjs/common';

import { RouletteConfig } from '../../domain/entities/roulette-config.entity';
import {
  ROULETTE_CONFIGS_REPOSITORY,
  type RouletteConfigsRepository,
} from '../../domain/repositories/roulette-configs.repository';

/**
 * Config vigente para una sucursal: la suya si la tiene, si no la global,
 * y si tampoco hay global, los valores por defecto (1/38 y x35, o sea una
 * ruleta honesta). Nunca falla por falta de configuración — un juego que
 * no se puede jugar hasta que alguien entre a la web sería peor.
 */
@Injectable()
export class ResolveRouletteConfig {
  constructor(
    @Inject(ROULETTE_CONFIGS_REPOSITORY)
    private readonly repo: RouletteConfigsRepository,
  ) {}

  async execute(salePointId: string): Promise<RouletteConfig> {
    const own = await this.repo.findBySalePoint(salePointId);
    if (own) return own;
    const global = await this.repo.findBySalePoint(null);
    if (global) return global;
    return RouletteConfig.create({ salePointId: null });
  }
}
