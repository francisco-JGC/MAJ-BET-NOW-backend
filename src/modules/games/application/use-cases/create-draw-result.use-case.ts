import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/domain.error';
import { DrawResult } from '../../domain/entities/draw-result.entity';
import {
  DRAW_RESULTS_REPOSITORY,
  type DrawResultsRepository,
} from '../../domain/repositories/draw-results.repository';
import {
  GAMES_REPOSITORY,
  type GamesRepository,
} from '../../domain/repositories/games.repository';
import { WinningNumberFormat } from '../../domain/value-objects/winning-number-format';
import {
  toDrawResultOutput,
  type DrawResultOutput,
} from '../dtos/draw-result.output';

export interface CreateDrawResultApplicationInput {
  gameId: string;
  drawAt: Date;
  winningNumber: string;
  recordedById: string;
}

@Injectable()
export class CreateDrawResult
  implements UseCase<CreateDrawResultApplicationInput, DrawResultOutput>
{
  constructor(
    @Inject(GAMES_REPOSITORY) private readonly games: GamesRepository,
    @Inject(DRAW_RESULTS_REPOSITORY)
    private readonly results: DrawResultsRepository,
  ) {}

  async execute(
    input: CreateDrawResultApplicationInput,
  ): Promise<DrawResultOutput> {
    const game = await this.games.findById(input.gameId);
    if (!game) throw new NotFoundError('Game', input.gameId);

    const existing = await this.results.findByGameAndDraw(
      input.gameId,
      input.drawAt,
    );
    if (existing) {
      throw new ValidationError(
        'A result already exists for this game and draw time. Use PATCH to update.',
      );
    }

    const winningNumber = WinningNumberFormat.validateAndNormalize(
      game.type,
      input.winningNumber,
    );

    const result = DrawResult.create({
      gameId: input.gameId,
      drawAt: input.drawAt,
      winningNumber,
      recordedById: input.recordedById,
    });
    await this.results.save(result);
    return toDrawResultOutput(result);
  }
}
