import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import {
  GAMES_REPOSITORY,
  type GamesRepository,
} from '../../domain/repositories/games.repository';
import { toGameOutput, type GameOutput } from '../dtos/game.output';

export interface ListGamesInput {
  onlyActive: boolean;
}

@Injectable()
export class ListGames implements UseCase<ListGamesInput, GameOutput[]> {
  constructor(
    @Inject(GAMES_REPOSITORY) private readonly games: GamesRepository,
  ) {}

  async execute(input: ListGamesInput): Promise<GameOutput[]> {
    const list = await this.games.findAll({ onlyActive: input.onlyActive });
    return list.map((game) => toGameOutput(game));
  }
}
