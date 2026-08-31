import type { LuckyDaily } from '../../domain/entities/lucky-daily.entity';
import type { LuckyKind } from '../../domain/value-objects/lucky-kind';

export interface LuckyDailyOutput {
  id: string;
  kind: LuckyKind;
  forDate: string;
  payload: unknown;
  createdAt: Date;
}

export const toLuckyDailyOutput = (entry: LuckyDaily): LuckyDailyOutput => ({
  id: entry.id,
  kind: entry.kind,
  forDate: formatDate(entry.forDate),
  payload: entry.payload,
  createdAt: entry.createdAt,
});

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}
