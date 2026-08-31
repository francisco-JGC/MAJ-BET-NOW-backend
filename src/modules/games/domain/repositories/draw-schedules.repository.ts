import type { DrawSchedule } from '../entities/draw-schedule.entity';

export const DRAW_SCHEDULES_REPOSITORY = Symbol('DRAW_SCHEDULES_REPOSITORY');

export interface DrawSchedulesRepository {
  save(schedule: DrawSchedule): Promise<void>;
  findById(id: string): Promise<DrawSchedule | null>;
  findByGameId(gameId: string): Promise<DrawSchedule[]>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}
