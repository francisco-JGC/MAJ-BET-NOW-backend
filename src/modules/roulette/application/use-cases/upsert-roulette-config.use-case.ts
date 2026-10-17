import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import { RouletteConfig } from '../../domain/entities/roulette-config.entity';
import {
  ROULETTE_CONFIGS_REPOSITORY,
  type RouletteConfigsRepository,
} from '../../domain/repositories/roulette-configs.repository';
import {
  toRouletteConfigOutput,
  type RouletteConfigOutput,
} from '../dtos/roulette.output';

export interface UpsertRouletteConfigInput {
  /** null = configuración global. */
  salePointId: string | null;
  winPercentBps?: number;
  prizeMultiplier?: number;
}

@Injectable()
export class UpsertRouletteConfig
  implements UseCase<UpsertRouletteConfigInput, RouletteConfigOutput>
{
  constructor(
    @Inject(ROULETTE_CONFIGS_REPOSITORY)
    private readonly repo: RouletteConfigsRepository,
  ) {}

  async execute(input: UpsertRouletteConfigInput): Promise<RouletteConfigOutput> {
    const existing = await this.repo.findBySalePoint(input.salePointId);
    const config =
      existing ??
      RouletteConfig.create({
        salePointId: input.salePointId,
        winPercentBps: input.winPercentBps,
        prizeMultiplier: input.prizeMultiplier,
      });

    if (existing) {
      existing.update({
        winPercentBps: input.winPercentBps,
        prizeMultiplier: input.prizeMultiplier,
      });
    }

    await this.repo.save(config);
    return toRouletteConfigOutput(config);
  }
}
