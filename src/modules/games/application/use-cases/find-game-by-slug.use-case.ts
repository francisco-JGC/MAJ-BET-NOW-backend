import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error';
import {
  GAMES_REPOSITORY,
  type GamesRepository,
} from '../../domain/repositories/games.repository';
import { toGameOutput, type GameOutput } from '../dtos/game.output';

@Injectable()
export class FindGameBySlug implements UseCase<string, GameOutput> {
  constructor(
    @Inject(GAMES_REPOSITORY) private readonly games: GamesRepository,
  ) {}

  async execute(slug: string): Promise<GameOutput> {
    const game = await this.games.findBySlug(slug);
    if (!game) throw new NotFoundError('Game', slug);
    return toGameOutput(game);
  }
}
