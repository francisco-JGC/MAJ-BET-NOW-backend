import type { DrawSchedule } from '../../domain/entities/draw-schedule.entity';

export interface DrawScheduleOutput {
  id: string;
  gameId: string;
  dayOfWeek: number | null;
  drawTime: string;
  cutoffMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const toDrawScheduleOutput = (
  schedule: DrawSchedule,
): DrawScheduleOutput => ({
  id: schedule.id,
  gameId: schedule.gameId,
  dayOfWeek: schedule.dayOfWeek,
  drawTime: schedule.drawTime,
  cutoffMinutes: schedule.cutoffMinutes,
  isActive: schedule.isActive,
  createdAt: schedule.createdAt,
  updatedAt: schedule.updatedAt,
});
