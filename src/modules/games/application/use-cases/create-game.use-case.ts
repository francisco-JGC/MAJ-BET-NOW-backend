import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import { ValidationError } from '../../../../shared/domain/errors/domain.error';
import { Game } from '../../domain/entities/game.entity';
import {
  GAMES_REPOSITORY,
  type GamesRepository,
} from '../../domain/repositories/games.repository';
import type { CreateGameApplicationInput } from '../dtos/create-game.input';
import { toGameOutput, type GameOutput } from '../dtos/game.output';

@Injectable()
export class CreateGame implements UseCase<CreateGameApplicationInput, GameOutput> {
  constructor(
    @Inject(GAMES_REPOSITORY) private readonly games: GamesRepository,
  ) {}

  async execute(input: CreateGameApplicationInput): Promise<GameOutput> {
    const existing = await this.games.findBySlug(input.slug);
    if (existing) throw new ValidationError('Slug already taken');

    const game = Game.create(input);
    await this.games.save(game);
    return toGameOutput(game);
  }
}
