import { randomUUID } from 'crypto';

import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { ValidationError } from '../../../../shared/domain/errors/domain.error';
import { RouletteBets, type RouletteBet } from '../value-objects/roulette-bet';

export interface RoulettePlayProps {
  salePointId: string;
  playerId: string;
  /** Apuestas: cada casilla con SU monto, ya validadas y sin repetidos. */
  bets: RouletteBet[];
  totalAmount: number;
  /** Casilla que salió. Siempre es una de las 38, gane o pierda. */
  winningNumber: string;
  isWin: boolean;
  /**
   * Monto de la casilla acertada × multiplicador; 0 si no ganó. Se paga
   * sobre lo apostado a ESA casilla, no sobre el total — el resto de las
   * fichas se pierden, igual que en una mesa real.
   */
  prize: number;
  /**
   * Config vigente al momento de jugar. Se congela acá a propósito: si
   * mañana cambia el porcentaje o el multiplicador, el historial tiene que
   * seguir explicando por qué ESTA jugada pagó lo que pagó. Sin esto, una
   * auditoría sobre jugadas viejas daría números que no cierran.
   */
  winPercentBps: number;
  prizeMultiplier: number;
  /**
   * Jugada de prueba: no cuenta como venta ni aparece en el historial
   * operativo. Se persiste igual —con la marca— en vez de no guardarse,
   * para que una racha rara pueda auditarse y se distinga "nadie jugó" de
   * "se jugó en prueba".
   */
  isTest: boolean;
  createdAt: Date;
}

export class RoulettePlay extends AggregateRoot<RoulettePlayProps> {
  private constructor(id: string, props: RoulettePlayProps) {
    super(id, props);
  }

  static create(input: {
    salePointId: string;
    playerId: string;
    bets: RouletteBet[];
    winningNumber: string;
    isWin: boolean;
    winPercentBps: number;
    prizeMultiplier: number;
    isTest?: boolean;
  }): RoulettePlay {
    if (input.bets.length === 0) {
      throw new ValidationError('Hay que elegir al menos un número');
    }
    return new RoulettePlay(randomUUID(), {
      salePointId: input.salePointId,
      playerId: input.playerId,
      bets: input.bets,
      totalAmount: RouletteBets.total(input.bets),
      winningNumber: input.winningNumber,
      isWin: input.isWin,
      prize: input.isWin
          ? RouletteBets.amountOf(input.bets, input.winningNumber) *
              input.prizeMultiplier
          : 0,
      winPercentBps: input.winPercentBps,
      prizeMultiplier: input.prizeMultiplier,
      isTest: input.isTest ?? false,
      createdAt: new Date(),
    });
  }

  static rehydrate(id: string, props: RoulettePlayProps): RoulettePlay {
    return new RoulettePlay(id, props);
  }

  get salePointId(): string { return this.props.salePointId; }
  get playerId(): string { return this.props.playerId; }
  get bets(): RouletteBet[] { return this.props.bets; }
  get numbers(): string[] { return this.props.bets.map((b) => b.number); }
  get totalAmount(): number { return this.props.totalAmount; }
  get winningNumber(): string { return this.props.winningNumber; }
  get isWin(): boolean { return this.props.isWin; }
  get prize(): number { return this.props.prize; }
  get winPercentBps(): number { return this.props.winPercentBps; }
  get prizeMultiplier(): number { return this.props.prizeMultiplier; }
  get isTest(): boolean { return this.props.isTest; }
  get createdAt(): Date { return this.props.createdAt; }

  /** Resultado neto para la casa: lo apostado menos lo pagado. */
  get houseNet(): number {
    if (this.props.isTest) return 0;
    return this.props.totalAmount - this.props.prize;
  }
}
