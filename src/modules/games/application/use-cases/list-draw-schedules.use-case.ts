import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error';
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

@Injectable()
export class ListDrawSchedules
  implements UseCase<string, DrawScheduleOutput[]>
{
  constructor(
    @Inject(GAMES_REPOSITORY) private readonly games: GamesRepository,
    @Inject(DRAW_SCHEDULES_REPOSITORY)
    private readonly schedules: DrawSchedulesRepository,
  ) {}

  async execute(gameId: string): Promise<DrawScheduleOutput[]> {
    const game = await this.games.findById(gameId);
    if (!game) throw new NotFoundError('Game', gameId);
    const items = await this.schedules.findByGameId(gameId);
    return items.map(toDrawScheduleOutput);
  }
}
