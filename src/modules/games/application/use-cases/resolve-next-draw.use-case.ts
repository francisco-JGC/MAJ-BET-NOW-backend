import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import {
  fromBusinessWallClock,
  toBusinessWallClock,
} from '../../../../shared/domain/business-time';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/domain.error';
import type { DrawSchedule } from '../../domain/entities/draw-schedule.entity';
import {
  DRAW_SCHEDULES_REPOSITORY,
  type DrawSchedulesRepository,
} from '../../domain/repositories/draw-schedules.repository';
import {
  GAMES_REPOSITORY,
  type GamesRepository,
} from '../../domain/repositories/games.repository';

export interface ResolveNextDrawInput {
  gameId: string;
  at: Date;
}

export interface ResolveNextDrawOutput {
  drawAt: Date;
  cutoffMinutes: number;
}

const LOOK_AHEAD_DAYS = 7;

@Injectable()
export class ResolveNextDraw
  implements UseCase<ResolveNextDrawInput, ResolveNextDrawOutput>
{
  constructor(
    @Inject(GAMES_REPOSITORY) private readonly games: GamesRepository,
    @Inject(DRAW_SCHEDULES_REPOSITORY)
    private readonly schedules: DrawSchedulesRepository,
  ) {}

  async execute(input: ResolveNextDrawInput): Promise<ResolveNextDrawOutput> {
    const game = await this.games.findById(input.gameId);
    if (!game) throw new NotFoundError('Game', input.gameId);

    const all = await this.schedules.findByGameId(input.gameId);
    return this.resolveFromData(game, all, input.at);
  }

  /**
   * Versión sincrónica que opera sobre datos ya cargados. Úsala desde
   * `CreateTicket` cuando game y schedules ya se cargaron en el bloque
   * inicial `Promise.all` — evita 2 roundtrips adicionales a la DB.
   */
  resolveFromData(
    game: { slug: string },
    allSchedules: DrawSchedule[],
    at: Date,
  ): ResolveNextDrawOutput {
    const active = allSchedules.filter((s) => s.isActive);
    if (active.length === 0) {
      throw new ValidationError(
        `Game "${game.slug}" has no active draw schedules`,
      );
    }

    const nowWall = toBusinessWallClock(at);
    const nowMinutes = nowWall.hour * 60 + nowWall.minute;

    const allDaySpecific = active.every((s) => s.dayOfWeek !== null);
    if (allDaySpecific && !active.some((s) => s.appliesTo(nowWall.dayOfWeek))) {
      throw new ValidationError(
        `Game "${game.slug}" no tiene sorteos programados para hoy`,
      );
    }

    for (let offset = 0; offset <= LOOK_AHEAD_DAYS; offset++) {
      if (offset > 0 && allDaySpecific) break;
      const anchor = fromBusinessWallClock(
        nowWall.year,
        nowWall.month,
        nowWall.day + offset,
        12,
        0,
      );
      const dayWall = toBusinessWallClock(anchor);
      const candidates = this.candidatesFor(active, dayWall.dayOfWeek);
      if (candidates.length === 0) continue;

      for (const schedule of candidates) {
        const drawMinutes = schedule.toMinutes();
        const cutoffThreshold = drawMinutes - schedule.cutoffMinutes;
        const passesCutoff = offset > 0 || nowMinutes < cutoffThreshold;
        if (!passesCutoff) continue;

        const [h, m] = schedule.drawTime.split(':').map(Number);
        const drawAt = fromBusinessWallClock(
          dayWall.year,
          dayWall.month,
          dayWall.day,
          h,
          m,
        );
        return { drawAt, cutoffMinutes: schedule.cutoffMinutes };
      }
    }

    throw new ValidationError(
      `No upcoming draw found for game "${game.slug}"`,
    );
  }

  private candidatesFor(
    schedules: DrawSchedule[],
    dayOfWeek: number,
  ): DrawSchedule[] {
    return schedules
      .filter((s) => s.appliesTo(dayOfWeek))
      .sort((a, b) => a.toMinutes() - b.toMinutes());
  }
}
