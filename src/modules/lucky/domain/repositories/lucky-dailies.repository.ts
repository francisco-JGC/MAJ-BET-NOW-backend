import type { LuckyDaily } from '../entities/lucky-daily.entity';
import type { LuckyKind } from '../value-objects/lucky-kind';

export const LUCKY_DAILIES_REPOSITORY = Symbol('LUCKY_DAILIES_REPOSITORY');

export interface LuckyDailiesRepository {
  save(entry: LuckyDaily): Promise<void>;
  findForDate(kind: LuckyKind, forDate: Date): Promise<LuckyDaily | null>;
  findHistory(kind: LuckyKind, limit: number): Promise<LuckyDaily[]>;
}
