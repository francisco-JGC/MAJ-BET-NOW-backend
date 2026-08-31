import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error';
import {
  GAMES_REPOSITORY,
  type GamesRepository,
} from '../../domain/repositories/games.repository';
import { toGameOutput, type GameOutput } from '../dtos/game.output';

export interface ToggleGameInput {
  id: string;
  active: boolean;
}

@Injectable()
export class ToggleGame implements UseCase<ToggleGameInput, GameOutput> {
  constructor(
    @Inject(GAMES_REPOSITORY) private readonly games: GamesRepository,
  ) {}

  async execute(input: ToggleGameInput): Promise<GameOutput> {
    const game = await this.games.findById(input.id);
    if (!game) throw new NotFoundError('Game', input.id);

    if (input.active) game.activate();
    else game.deactivate();

    await this.games.save(game);
    return toGameOutput(game);
  }
}
