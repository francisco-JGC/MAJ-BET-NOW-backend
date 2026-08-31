import { Inject, Injectable, Logger } from '@nestjs/common';

import { DrawSchedule } from '../../domain/entities/draw-schedule.entity';
import {
  DRAW_SCHEDULES_REPOSITORY,
  type DrawSchedulesRepository,
} from '../../domain/repositories/draw-schedules.repository';
import {
  GAMES_REPOSITORY,
  type GamesRepository,
} from '../../domain/repositories/games.repository';

interface ScheduleTemplate {
  dayOfWeek: number | null;
  drawTime: string;
  cutoffMinutes?: number;
}

const TICA_CUTOFF_MINUTES = 10;

const DEFAULT_SCHEDULE: ScheduleTemplate[] = [
  { dayOfWeek: null, drawTime: '11:00' },
  { dayOfWeek: null, drawTime: '15:00' },
  { dayOfWeek: null, drawTime: '21:00' },
  { dayOfWeek: 6, drawTime: '18:00' },
  { dayOfWeek: 0, drawTime: '18:00' },
];

const OVERRIDES: Record<string, ScheduleTemplate[]> = {
  primera: [
    { dayOfWeek: null, drawTime: '10:00' },
    { dayOfWeek: null, drawTime: '17:00' },
  ],
  hondurena: [
    { dayOfWeek: null, drawTime: '11:00' },
    { dayOfWeek: null, drawTime: '15:00' },
    { dayOfWeek: null, drawTime: '21:00' },
  ],
  tica: [
    { dayOfWeek: null, drawTime: '13:00', cutoffMinutes: TICA_CUTOFF_MINUTES },
    { dayOfWeek: null, drawTime: '16:30', cutoffMinutes: TICA_CUTOFF_MINUTES },
    { dayOfWeek: null, drawTime: '19:30', cutoffMinutes: TICA_CUTOFF_MINUTES },
  ],
};

@Injectable()
export class SeedInitialSchedules {
  private readonly logger = new Logger(SeedInitialSchedules.name);

  constructor(
    @Inject(GAMES_REPOSITORY) private readonly games: GamesRepository,
    @Inject(DRAW_SCHEDULES_REPOSITORY)
    private readonly schedules: DrawSchedulesRepository,
  ) {}

  async execute(): Promise<number> {
    const existing = await this.schedules.count();
    if (existing > 0) return 0;

    const games = await this.games.findAll({ onlyActive: false });
    let created = 0;
    for (const game of games) {
      const templates = OVERRIDES[game.slug] ?? DEFAULT_SCHEDULE;
      for (const t of templates) {
        const schedule = DrawSchedule.create({
          gameId: game.id,
          dayOfWeek: t.dayOfWeek,
          drawTime: t.drawTime,
          cutoffMinutes: t.cutoffMinutes,
        });
        await this.schedules.save(schedule);
        created += 1;
      }
    }

    this.logger.log(`Seeded ${created} initial draw schedules`);
    return created;
  }
}
