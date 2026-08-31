import { DrawSchedule } from '../../../domain/entities/draw-schedule.entity';
import { DrawScheduleOrmEntity } from '../entities/draw-schedule.orm-entity';

export class DrawScheduleMapper {
  static toDomain(orm: DrawScheduleOrmEntity): DrawSchedule {
    return DrawSchedule.restore(orm.id, {
      gameId: orm.gameId,
      dayOfWeek: orm.dayOfWeek,
      drawTime: orm.drawTime,
      cutoffMinutes: orm.cutoffMinutes,
      isActive: orm.isActive,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(schedule: DrawSchedule): DrawScheduleOrmEntity {
    const entity = new DrawScheduleOrmEntity();
    entity.id = schedule.id;
    entity.gameId = schedule.gameId;
    entity.dayOfWeek = schedule.dayOfWeek;
    entity.drawTime = schedule.drawTime;
    entity.cutoffMinutes = schedule.cutoffMinutes;
    entity.isActive = schedule.isActive;
    entity.createdAt = schedule.createdAt;
    entity.updatedAt = schedule.updatedAt;
    return entity;
  }
}
