import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error';
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

export interface UpdateDrawResultApplicationInput {
  id: string;
  winningNumber: string;
  recordedById: string;
}

@Injectable()
export class UpdateDrawResult
  implements UseCase<UpdateDrawResultApplicationInput, DrawResultOutput>
{
  constructor(
    @Inject(GAMES_REPOSITORY) private readonly games: GamesRepository,
    @Inject(DRAW_RESULTS_REPOSITORY)
    private readonly results: DrawResultsRepository,
  ) {}

  async execute(
    input: UpdateDrawResultApplicationInput,
  ): Promise<DrawResultOutput> {
    const result = await this.results.findById(input.id);
    if (!result) throw new NotFoundError('DrawResult', input.id);

    const game = await this.games.findById(result.gameId);
    if (!game) throw new NotFoundError('Game', result.gameId);

    const normalized = WinningNumberFormat.validateAndNormalize(
      game.type,
      input.winningNumber,
    );

    result.changeWinningNumber(normalized, input.recordedById);
    await this.results.save(result);
    return toDrawResultOutput(result);
  }
}
