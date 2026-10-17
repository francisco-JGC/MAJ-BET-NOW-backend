import { randomUUID } from 'crypto';

import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { ValidationError } from '../../../../shared/domain/errors/domain.error';
import { FAIR_WIN_PERCENT_BPS } from '../value-objects/roulette-number';

export const DEFAULT_PRIZE_MULTIPLIER = 35;

export interface RouletteConfigProps {
  /** null = configuración global (fallback de las sucursales sin la suya). */
  salePointId: string | null;
  /**
   * Probabilidad de acertar POR NÚMERO elegido, en basis points (0-10000).
   * La probabilidad de la jugada es `cantidadDeNúmeros × winPercentBps`.
   *
   * Es por número y no por jugada a propósito: con un porcentaje fijo por
   * jugada, elegir 5 números costaría 5 veces más sin mejorar en nada la
   * chance de ganar. Por número, el juego se comporta como una ruleta de
   * verdad cuando el valor es {@link FAIR_WIN_PERCENT_BPS} (1/38).
   */
  winPercentBps: number;
  /** Paga `multiplier × monto apostado al número acertado`. */
  prizeMultiplier: number;
  /**
   * Modo prueba de la sucursal. Se decide desde la web y NO desde la app:
   * si el vendedor pudiera activarlo, podría marcar como prueba tiradas
   * que en el mostrador cobró de verdad.
   *
   * Con el modo activo la tirada se registra en el historial de ruleta
   * para auditoría, pero no genera ticket ni sorteo: no entra a facturas,
   * ni a la cuenta del vendedor, ni a ganadores.
   */
  testMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class RouletteConfig extends AggregateRoot<RouletteConfigProps> {
  private constructor(id: string, props: RouletteConfigProps) {
    super(id, props);
  }

  static create(input: {
    salePointId?: string | null;
    winPercentBps?: number;
    prizeMultiplier?: number;
    testMode?: boolean;
  }): RouletteConfig {
    const winPercentBps = input.winPercentBps ?? FAIR_WIN_PERCENT_BPS;
    const prizeMultiplier = input.prizeMultiplier ?? DEFAULT_PRIZE_MULTIPLIER;
    RouletteConfig.assertWinPercent(winPercentBps);
    RouletteConfig.assertMultiplier(prizeMultiplier);
    const now = new Date();
    return new RouletteConfig(randomUUID(), {
      salePointId: input.salePointId ?? null,
      winPercentBps,
      prizeMultiplier,
      testMode: input.testMode ?? false,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(id: string, props: RouletteConfigProps): RouletteConfig {
    return new RouletteConfig(id, props);
  }

  get salePointId(): string | null {
    return this.props.salePointId;
  }
  get winPercentBps(): number {
    return this.props.winPercentBps;
  }
  get prizeMultiplier(): number {
    return this.props.prizeMultiplier;
  }
  get testMode(): boolean {
    return this.props.testMode;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Retorno al jugador, en basis points. Las dos perillas están acopladas:
   * `RTP = probabilidad × (multiplicador + 1)`. Por encima de 10000 la casa
   * pierde plata en el largo plazo, así que conviene mostrarlo en la web
   * junto a los inputs en vez de dejar que se descubra por la caja.
   */
  get rtpBps(): number {
    return this.props.winPercentBps * (this.props.prizeMultiplier + 1);
  }

  update(input: {
    winPercentBps?: number;
    prizeMultiplier?: number;
    testMode?: boolean;
  }): void {
    if (input.testMode !== undefined) {
      this.props.testMode = input.testMode;
    }
    if (input.winPercentBps !== undefined) {
      RouletteConfig.assertWinPercent(input.winPercentBps);
      this.props.winPercentBps = input.winPercentBps;
    }
    if (input.prizeMultiplier !== undefined) {
      RouletteConfig.assertMultiplier(input.prizeMultiplier);
      this.props.prizeMultiplier = input.prizeMultiplier;
    }
    this.props.updatedAt = new Date();
  }

  private static assertWinPercent(bps: number): void {
    if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) {
      throw new ValidationError(
        'El porcentaje de victoria debe ser un entero entre 0 y 10000 basis points (0% a 100%)',
      );
    }
  }

  private static assertMultiplier(multiplier: number): void {
    if (!Number.isInteger(multiplier) || multiplier < 1) {
      throw new ValidationError('El multiplicador debe ser un entero mayor o igual a 1');
    }
  }
}
