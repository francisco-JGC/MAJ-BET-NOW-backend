import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error';
import {
  DRAW_SCHEDULES_REPOSITORY,
  type DrawSchedulesRepository,
} from '../../domain/repositories/draw-schedules.repository';

@Injectable()
export class DeleteDrawSchedule implements UseCase<string, void> {
  constructor(
    @Inject(DRAW_SCHEDULES_REPOSITORY)
    private readonly schedules: DrawSchedulesRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const found = await this.schedules.findById(id);
    if (!found) throw new NotFoundError('DrawSchedule', id);
    await this.schedules.delete(id);
  }
}
