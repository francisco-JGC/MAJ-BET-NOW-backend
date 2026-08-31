import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

import { LuckyKind } from '../../../domain/value-objects/lucky-kind';
import type { LuckyPayload } from '../../../domain/entities/lucky-daily.entity';

@Entity({ name: 'lucky_dailies' })
@Index(['kind', 'forDate'], { unique: true })
@Index(['forDate'])
export class LuckyDailyOrmEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'varchar', length: 20 })
  kind!: LuckyKind;

  @Column({ type: 'date', name: 'for_date' })
  forDate!: string;

  @Column({ type: 'jsonb' })
  payload!: LuckyPayload;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
