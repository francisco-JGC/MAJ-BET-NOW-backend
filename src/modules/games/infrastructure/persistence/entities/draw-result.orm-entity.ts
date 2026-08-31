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

@Entity({ name: 'draw_results' })
@Index(['gameId', 'drawAt'], { unique: true })
@Index(['drawAt'])
export class DrawResultOrmEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'uuid', name: 'game_id' })
  gameId!: string;

  @ManyToOne(() => GameOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'game_id' })
  game?: GameOrmEntity;

  @Column({ type: 'timestamptz', name: 'draw_at' })
  drawAt!: Date;

  @Column({ type: 'varchar', name: 'winning_number', length: 20 })
  winningNumber!: string;

  @Column({ type: 'uuid', name: 'recorded_by_id' })
  recordedById!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
