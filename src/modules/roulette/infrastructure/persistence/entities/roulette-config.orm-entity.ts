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

import { SalePointOrmEntity } from '../../../../sale-points/infrastructure/persistence/entities/sale-point.orm-entity';

@Entity({ name: 'roulette_configs' })
export class RouletteConfigOrmEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  /**
   * null = configuración global. El índice único parcial que garantiza
   * "una sola fila global" vive en la migración: Postgres no aplica UNIQUE
   * sobre NULL, así que hace falta un índice con `WHERE sale_point_id IS NULL`.
   */
  @Index()
  @Column({ type: 'uuid', name: 'sale_point_id', nullable: true })
  salePointId!: string | null;

  @ManyToOne(() => SalePointOrmEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'sale_point_id' })
  salePoint?: SalePointOrmEntity;

  @Column({ type: 'integer', name: 'win_percent_bps' })
  winPercentBps!: number;

  @Column({ type: 'integer', name: 'prize_multiplier' })
  prizeMultiplier!: number;

  /// Modo prueba: las tiradas se registran pero no generan ticket ni sorteo.
  @Column({ type: 'boolean', name: 'test_mode', default: false })
  testMode!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
