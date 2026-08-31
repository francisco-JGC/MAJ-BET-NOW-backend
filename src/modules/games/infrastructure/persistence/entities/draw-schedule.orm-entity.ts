import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { GameOrmEntity } from './game.orm-entity';

@Entity({ name: 'draw_schedules' })
@Index(['gameId'])
export class DrawScheduleOrmEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'uuid', name: 'game_id' })
  gameId!: string;

  @ManyToOne(() => GameOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game?: GameOrmEntity;

  @Column({ type: 'smallint', name: 'day_of_week', nullable: true })
  dayOfWeek!: number | null;

  @Column({ type: 'varchar', length: 5, name: 'draw_time' })
  drawTime!: string;

  @Column({ type: 'integer', name: 'cutoff_minutes', default: 2 })
  cutoffMinutes!: number;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
