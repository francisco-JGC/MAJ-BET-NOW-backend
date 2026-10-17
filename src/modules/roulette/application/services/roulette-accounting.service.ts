import { Inject, Injectable, Logger } from '@nestjs/common';

import { NotFoundError } from '../../../../shared/domain/errors/domain.error';
import { DrawResult } from '../../../games/domain/entities/draw-result.entity';
import {
  DRAW_RESULTS_REPOSITORY,
  type DrawResultsRepository,
} from '../../../games/domain/repositories/draw-results.repository';
import {
  GAMES_REPOSITORY,
  type GamesRepository,
} from '../../../games/domain/repositories/games.repository';
import { GameType } from '../../../games/domain/value-objects/game-type';
import {
  FOLIO_GENERATOR,
  type FolioGenerator,
} from '../../../tickets/application/ports/folio-generator.port';
import { Ticket } from '../../../tickets/domain/entities/ticket.entity';
import { TicketLine } from '../../../tickets/domain/value-objects/ticket-line';
import {
  TICKETS_REPOSITORY,
  type TicketsRepository,
} from '../../../tickets/domain/repositories/tickets.repository';
import type { RoulettePlay } from '../../domain/entities/roulette-play.entity';

/** Slug del juego que representa la ruleta dentro del catálogo. */
export const ROULETTE_GAME_SLUG = 'ruleta';

/**
 * Lleva una tirada de ruleta a la contabilidad normal del sistema.
 *
 * La ruleta no tiene sorteos programados, así que **cada tirada es su
 * propio sorteo**: se crea el ticket con `drawAt` en el instante exacto
 * del giro y un `draw_result` para ese mismo instante con la casilla que
 * salió. A partir de ahí el evaluador existente decide ganadores sin que
 * haya que tocar una sola consulta de reportes — facturas, cuenta del
 * vendedor, totales de sucursal y ganadores funcionan solos.
 *
 * No pasa por `CreateTicket` a propósito: ese caso de uso aplica horarios,
 * cutoff, cierre nocturno y topes por número, ninguno de los cuales tiene
 * sentido en un minijuego instantáneo.
 */
@Injectable()
export class RouletteAccounting {
  private readonly logger = new Logger(RouletteAccounting.name);

  constructor(
    @Inject(TICKETS_REPOSITORY) private readonly tickets: TicketsRepository,
    @Inject(DRAW_RESULTS_REPOSITORY)
    private readonly results: DrawResultsRepository,
    @Inject(GAMES_REPOSITORY) private readonly games: GamesRepository,
    @Inject(FOLIO_GENERATOR) private readonly folio: FolioGenerator,
  ) {}

  /**
   * Registra la tirada como ticket + sorteo. Devuelve el folio emitido.
   */
  async register(play: RoulettePlay): Promise<string> {
    const game = await this.games.findBySlug(ROULETTE_GAME_SLUG);
    if (!game) throw new NotFoundError('Game', ROULETTE_GAME_SLUG);
    if (game.type !== GameType.ROULETTE) {
      throw new NotFoundError('Game', `${ROULETTE_GAME_SLUG} (tipo incorrecto)`);
    }

    const drawAt = await this.reserveDrawSlot(game.id, play);

    const lines = play.numbers.map(
      (label, i) =>
        new TicketLine({
          label,
          amount: play.amountPerNumber,
          // Premio potencial de ESA línea. El evaluador lo paga tal cual
          // si la casilla coincide con el resultado.
          prize: play.amountPerNumber * play.prizeMultiplier,
          pairEasyPrize: null,
          subGameId: null,
          subGameName: null,
          orderIndex: i,
        }),
    );

    const ticket = Ticket.create({
      folio: this.folio.generate(),
      gameId: game.id,
      salePointId: play.salePointId,
      sellerId: play.playerId,
      client: null,
      lines,
      drawAt,
      // No hay ventana de cierre: el sorteo ocurre en el mismo instante.
      cutoffMinutes: 0,
      clientRequestId: play.id,
    });

    await this.tickets.save(ticket);
    return ticket.folio;
  }

  /**
   * Reserva un instante libre para el sorteo de esta tirada.
   *
   * `draw_results` es único por (game_id, draw_at). Dos giros en el mismo
   * microsegundo no solo chocarían contra el índice: compartirían sorteo,
   * y un vendedor quedaría evaluado con la casilla que le salió a otro.
   * Por eso se empuja el instante hasta encontrar uno libre.
   */
  private async reserveDrawSlot(
    gameId: string,
    play: RoulettePlay,
  ): Promise<Date> {
    let drawAt = play.createdAt;
    for (let attempt = 0; attempt < 50; attempt++) {
      const taken = await this.results.findByGameAndDraw(gameId, drawAt);
      if (!taken) {
        await this.results.save(
          DrawResult.create({
            gameId,
            drawAt,
            winningNumber: play.winningNumber,
            recordedById: play.playerId,
          }),
        );
        return drawAt;
      }
      drawAt = new Date(drawAt.getTime() + 1);
    }
    // 50 colisiones de milisegundo seguidas no es contención: es un reloj
    // detenido o algo peor. Fallar es mejor que asignar un sorteo ajeno.
    throw new Error('No se pudo reservar un sorteo libre para la ruleta');
  }
}
