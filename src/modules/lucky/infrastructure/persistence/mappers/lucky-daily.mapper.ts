import { LuckyDaily } from '../../../domain/entities/lucky-daily.entity';
import { LuckyDailyOrmEntity } from '../entities/lucky-daily.orm-entity';

export class LuckyDailyMapper {
  static toDomain(orm: LuckyDailyOrmEntity): LuckyDaily {
    return LuckyDaily.restore(orm.id, {
      kind: orm.kind,
      // Parse as local date to avoid UTC/local drift: new Date('2026-07-11')
      // is interpreted as UTC midnight, which shifts to the previous day in
      // negative-offset timezones.
      forDate: LuckyDailyMapper.parseLocalDate(orm.forDate),
      payload: orm.payload,
      createdAt: orm.createdAt,
    });
  }

  private static parseLocalDate(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  static toOrm(entry: LuckyDaily): LuckyDailyOrmEntity {
    const orm = new LuckyDailyOrmEntity();
    orm.id = entry.id;
    orm.kind = entry.kind;
    orm.forDate = LuckyDailyMapper.formatDate(entry.forDate);
    orm.payload = entry.payload;
    orm.createdAt = entry.createdAt;
    return orm;
  }

  private static formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
