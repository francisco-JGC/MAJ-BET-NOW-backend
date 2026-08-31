import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import {
  DRAW_RESULTS_REPOSITORY,
  type DrawResultsRepository,
} from '../../domain/repositories/draw-results.repository';
import {
  toDrawResultOutput,
  type DrawResultOutput,
} from '../dtos/draw-result.output';

export interface ListDrawResultsInput {
  gameId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class ListDrawResults
  implements UseCase<ListDrawResultsInput, DrawResultOutput[]>
{
  constructor(
    @Inject(DRAW_RESULTS_REPOSITORY)
    private readonly results: DrawResultsRepository,
  ) {}

  async execute(input: ListDrawResultsInput): Promise<DrawResultOutput[]> {
    const items = await this.results.findMany({
      gameId: input.gameId,
      from: input.from,
      to: input.to,
      limit: input.limit,
      offset: input.offset,
    });
    return items.map(toDrawResultOutput);
  }
}
