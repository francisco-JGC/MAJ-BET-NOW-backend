import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error';
import { DrawSchedule } from '../../domain/entities/draw-schedule.entity';
import {
  DRAW_SCHEDULES_REPOSITORY,
  type DrawSchedulesRepository,
} from '../../domain/repositories/draw-schedules.repository';
import {
  GAMES_REPOSITORY,
  type GamesRepository,
} from '../../domain/repositories/games.repository';
import {
  toDrawScheduleOutput,
  type DrawScheduleOutput,
} from '../dtos/draw-schedule.output';

export interface CreateDrawScheduleApplicationInput {
  gameId: string;
  dayOfWeek: number | null;
  drawTime: string;
  cutoffMinutes?: number;
}

@Injectable()
export class CreateDrawSchedule
  implements UseCase<CreateDrawScheduleApplicationInput, DrawScheduleOutput>
{
  constructor(
    @Inject(GAMES_REPOSITORY) private readonly games: GamesRepository,
    @Inject(DRAW_SCHEDULES_REPOSITORY)
    private readonly schedules: DrawSchedulesRepository,
  ) {}

  async execute(
    input: CreateDrawScheduleApplicationInput,
  ): Promise<DrawScheduleOutput> {
    const game = await this.games.findById(input.gameId);
    if (!game) throw new NotFoundError('Game', input.gameId);

    const schedule = DrawSchedule.create({
      gameId: input.gameId,
      dayOfWeek: input.dayOfWeek,
      drawTime: input.drawTime,
      cutoffMinutes: input.cutoffMinutes,
    });
    await this.schedules.save(schedule);
    return toDrawScheduleOutput(schedule);
  }
}
