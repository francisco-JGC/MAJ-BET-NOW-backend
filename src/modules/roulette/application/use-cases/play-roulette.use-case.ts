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
import { RouletteBets } from '../../domain/value-objects/roulette-bet';
import {
  toRoulettePlayOutput,
  type RoulettePlayOutput,
} from '../dtos/roulette.output';
import { RouletteAccounting } from '../services/roulette-accounting.service';
import { SpinResolver } from '../services/spin-resolver.service';
import { ResolveRouletteConfig } from './resolve-roulette-config.use-case';

export interface PlayRouletteInput {
  salePointId: string;
  playerId: string;
  bets: Array<{ number: string; amount: number }>;
  /** Lo elige el vendedor; solo vale si la sucursal lo tiene habilitado. */
  isTest?: boolean;
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
    private readonly accounting: RouletteAccounting,
  ) {}

  async execute(input: PlayRouletteInput): Promise<RoulettePlayOutput> {
    const salePoint = await this.salePoints.findById(input.salePointId);
    if (!salePoint) throw new NotFoundError('SalePoint', input.salePointId);
    if (!salePoint.isActive) {
      throw new ForbiddenException('La sucursal está inactiva');
    }

    const bets = RouletteBets.parse(input.bets);
    const numbers = bets.map((b) => b.number);
    const config = await this.resolveConfig.execute(input.salePointId);

    const outcome = this.spin.resolve(numbers, config.winPercentBps);

    const play = RoulettePlay.create({
      salePointId: input.salePointId,
      playerId: input.playerId,
      bets,
      winningNumber: outcome.winningNumber,
      isWin: outcome.isWin,
      winPercentBps: config.winPercentBps,
      prizeMultiplier: config.prizeMultiplier,
      // El vendedor elige, pero solo dentro de lo que el admin habilitó.
      // Si la sucursal no permite pruebas, cualquier `isTest` que llegue
      // se ignora: la tirada es real y factura.
      isTest: config.testMode && (input.isTest ?? false),
    });

    // La tirada SIEMPRE se guarda en el historial de ruleta, de prueba o
    // no, para que una racha llamativa pueda auditarse. Lo que cambia es
    // si además entra a la contabilidad.
    await this.plays.save(play);

    if (!play.isTest) {
      await this.accounting.register(play);
    }

    return toRoulettePlayOutput(play);
  }
}
