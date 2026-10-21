import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error';
import {
  GAMES_REPOSITORY,
  type GamesRepository,
} from '../../../games/domain/repositories/games.repository';
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
import {
  RouletteAccounting,
  ROULETTE_GAME_SLUG,
} from '../services/roulette-accounting.service';
import { RouletteGameAccess } from '../services/roulette-game-access.service';
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
    @Inject(GAMES_REPOSITORY) private readonly games: GamesRepository,
    private readonly resolveConfig: ResolveRouletteConfig,
    private readonly spin: SpinResolver,
    private readonly accounting: RouletteAccounting,
    private readonly gameAccess: RouletteGameAccess,
  ) {}

  async execute(input: PlayRouletteInput): Promise<RoulettePlayOutput> {
    await this.gameAccess.assertEnabledForPlay();

    // Desactivar el juego desde la web tiene que cortar la venta de
    // verdad. Sin este chequeo, la ruleta seguía aceptando tiradas: a
    // diferencia del resto de los juegos no pasa por `CreateTicket`, que
    // es donde vive esa validación para todos los demás.
    const game = await this.games.findBySlug(ROULETTE_GAME_SLUG);
    if (!game) throw new NotFoundError('Game', ROULETTE_GAME_SLUG);
    if (!game.isActive) {
      throw new ForbiddenException('La ruleta está desactivada');
    }

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

    // El registro contable va PRIMERO y la jugada después.
    //
    // No son atómicos entre sí (viven en módulos distintos), así que el
    // orden decide qué pasa si algo falla. Si el ticket falla, no queda
    // jugada: el vendedor ve el error, no cobra, y no hay rastro
    // inconsistente. Al revés —jugada guardada y ticket fallido— habría
    // una tirada cobrada que nunca llegó a facturación, que es el peor
    // de los dos resultados posibles.
    if (!play.isTest) {
      await this.accounting.register(play);
    }

    // De prueba o no, la tirada queda en el historial de ruleta para que
    // una racha llamativa pueda auditarse.
    await this.plays.save(play);

    return toRoulettePlayOutput(play);
  }
}
