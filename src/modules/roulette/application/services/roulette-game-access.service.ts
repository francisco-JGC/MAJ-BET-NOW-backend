import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { NotFoundError } from '../../../../shared/domain/errors/domain.error';
import {
  GAMES_REPOSITORY,
  type GamesRepository,
} from '../../../games/domain/repositories/games.repository';
import { ROULETTE_GAME_SLUG } from './roulette-accounting.service';

/**
 * La ruleta comparte el catálogo de juegos (`games.is_active`). Desactivarla
 * desde el admin (Sorteos → Ruleta) debe cortar jugadas y config en la app,
 * igual que con cualquier otro juego en venta.
 */
@Injectable()
export class RouletteGameAccess {
  constructor(
    @Inject(GAMES_REPOSITORY) private readonly games: GamesRepository,
  ) {}

  async assertEnabledForPlay(): Promise<void> {
    const game = await this.games.findBySlug(ROULETTE_GAME_SLUG);
    if (!game) throw new NotFoundError('Game', ROULETTE_GAME_SLUG);
    if (!game.isActive) {
      throw new ForbiddenException('El juego de ruleta está desactivado');
    }
  }
}
