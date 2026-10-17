import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { SalePointOrmEntity } from '../../../../sale-points/infrastructure/persistence/entities/sale-point.orm-entity';
import { UserOrmEntity } from '../../../../users/infrastructure/persistence/entities/user.orm-entity';

@Entity({ name: 'roulette_plays' })
@Index(['salePointId', 'createdAt'])
export class RoulettePlayOrmEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'uuid', name: 'sale_point_id' })
  salePointId!: string;

  @ManyToOne(() => SalePointOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sale_point_id' })
  salePoint?: SalePointOrmEntity;

  @Index()
  @Column({ type: 'uuid', name: 'player_id' })
  playerId!: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'player_id' })
  player?: UserOrmEntity;

  /** Casillas elegidas. `text[]` porque '0' y '00' son distintas. */
  @Column({ type: 'text', array: true })
  numbers!: string[];

  @Column({ type: 'integer', name: 'amount_per_number' })
  amountPerNumber!: number;

  @Column({ type: 'integer', name: 'total_amount' })
  totalAmount!: number;

  @Column({ type: 'varchar', length: 2, name: 'winning_number' })
  winningNumber!: string;

  @Column({ type: 'boolean', name: 'is_win' })
  isWin!: boolean;

  @Column({ type: 'integer' })
  prize!: number;

  // Config congelada al momento de jugar — ver RoulettePlayProps.
  @Column({ type: 'integer', name: 'win_percent_bps' })
  winPercentBps!: number;

  @Column({ type: 'integer', name: 'prize_multiplier' })
  prizeMultiplier!: number;

  /// Jugada de prueba: fuera de ventas, historial y caja.
  @Index()
  @Column({ type: 'boolean', name: 'is_test', default: false })
  isTest!: boolean;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
