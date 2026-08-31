import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error';
import {
  DRAW_RESULTS_REPOSITORY,
  type DrawResultsRepository,
} from '../../domain/repositories/draw-results.repository';

@Injectable()
export class DeleteDrawResult implements UseCase<string, void> {
  constructor(
    @Inject(DRAW_RESULTS_REPOSITORY)
    private readonly results: DrawResultsRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const found = await this.results.findById(id);
    if (!found) throw new NotFoundError('DrawResult', id);
    await this.results.delete(id);
  }
}
