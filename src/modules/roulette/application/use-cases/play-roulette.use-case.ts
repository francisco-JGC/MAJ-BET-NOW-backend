import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error';
import {
  SALE_POINTS_REPOSITORY,
  type SalePointsRepository,
} from '../../../sale-points/domain/repositories/sale-points.repository';
import { RoulettePlay } from '../../domain/entities/roulette-play.entity';
import {
  ROULETTE_PLAYS_REPOSITORY,
  type RoulettePlaysRepository,
} from '../../domain/repositories/roulette-plays.repository';
import { RouletteNumber } from '../../domain/value-objects/roulette-number';
import {
  toRoulettePlayOutput,
  type RoulettePlayOutput,
} from '../dtos/roulette.output';
import { SpinResolver } from '../services/spin-resolver.service';
import { ResolveRouletteConfig } from './resolve-roulette-config.use-case';

export interface PlayRouletteInput {
  salePointId: string;
  playerId: string;
  numbers: string[];
  amountPerNumber: number;
}

/**
 * Juega y resuelve en el mismo request: no hay sorteo, horario ni cutoff.
 *
 * El resultado lo decide SIEMPRE el servidor. El cliente manda qué números
 * eligió y cuánto apuesta; qué casilla sale no se negocia con él.
 */
@Injectable()
export class PlayRoulette
  implements UseCase<PlayRouletteInput, RoulettePlayOutput>
{
  constructor(
    @Inject(ROULETTE_PLAYS_REPOSITORY)
    private readonly plays: RoulettePlaysRepository,
    @Inject(SALE_POINTS_REPOSITORY)
    private readonly salePoints: SalePointsRepository,
    private readonly resolveConfig: ResolveRouletteConfig,
    private readonly spin: SpinResolver,
  ) {}

  async execute(input: PlayRouletteInput): Promise<RoulettePlayOutput> {
    if (!Number.isInteger(input.amountPerNumber) || input.amountPerNumber < 1) {
      throw new ValidationError('El monto por número debe ser un entero mayor a 0');
    }

    const salePoint = await this.salePoints.findById(input.salePointId);
    if (!salePoint) throw new NotFoundError('SalePoint', input.salePointId);
    if (!salePoint.isActive) {
      throw new ForbiddenException('La sucursal está inactiva');
    }

    const numbers = RouletteNumber.parseSelection(input.numbers);
    const config = await this.resolveConfig.execute(input.salePointId);

    const outcome = this.spin.resolve(numbers, config.winPercentBps);

    const play = RoulettePlay.create({
      salePointId: input.salePointId,
      playerId: input.playerId,
      numbers,
      amountPerNumber: input.amountPerNumber,
      winningNumber: outcome.winningNumber,
      isWin: outcome.isWin,
      winPercentBps: config.winPercentBps,
      prizeMultiplier: config.prizeMultiplier,
    });

    await this.plays.save(play);
    return toRoulettePlayOutput(play);
  }
}
