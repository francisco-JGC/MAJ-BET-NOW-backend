import { randomUUID } from 'crypto';

import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { ValidationError } from '../../../../shared/domain/errors/domain.error';

export interface RoulettePlayProps {
  salePointId: string;
  playerId: string;
  /** Casillas elegidas, ya validadas y sin repetidos. */
  numbers: string[];
  /** Monto apostado a CADA número. El total es `amount × numbers.length`. */
  amountPerNumber: number;
  totalAmount: number;
  /** Casilla que salió. Siempre es una de las 38, gane o pierda. */
  winningNumber: string;
  isWin: boolean;
  /** `amountPerNumber × multiplicador` si ganó; 0 si no. */
  prize: number;
  /**
   * Config vigente al momento de jugar. Se congela acá a propósito: si
   * mañana cambia el porcentaje o el multiplicador, el historial tiene que
   * seguir explicando por qué ESTA jugada pagó lo que pagó. Sin esto, una
   * auditoría sobre jugadas viejas daría números que no cierran.
   */
  winPercentBps: number;
  prizeMultiplier: number;
  createdAt: Date;
}

export class RoulettePlay extends AggregateRoot<RoulettePlayProps> {
  private constructor(id: string, props: RoulettePlayProps) {
    super(id, props);
  }

  static create(input: {
    salePointId: string;
    playerId: string;
    numbers: string[];
    amountPerNumber: number;
    winningNumber: string;
    isWin: boolean;
    winPercentBps: number;
    prizeMultiplier: number;
  }): RoulettePlay {
    if (!Number.isInteger(input.amountPerNumber) || input.amountPerNumber < 1) {
      throw new ValidationError('El monto por número debe ser un entero mayor a 0');
    }
    if (input.numbers.length === 0) {
      throw new ValidationError('Hay que elegir al menos un número');
    }
    return new RoulettePlay(randomUUID(), {
      salePointId: input.salePointId,
      playerId: input.playerId,
      numbers: input.numbers,
      amountPerNumber: input.amountPerNumber,
      totalAmount: input.amountPerNumber * input.numbers.length,
      winningNumber: input.winningNumber,
      isWin: input.isWin,
      // Se paga sobre el monto del número acertado, no sobre el total
      // apostado — igual que en una ruleta real, donde el resto de las
      // fichas se pierden.
      prize: input.isWin ? input.amountPerNumber * input.prizeMultiplier : 0,
      winPercentBps: input.winPercentBps,
      prizeMultiplier: input.prizeMultiplier,
      createdAt: new Date(),
    });
  }

  static rehydrate(id: string, props: RoulettePlayProps): RoulettePlay {
    return new RoulettePlay(id, props);
  }

  get salePointId(): string { return this.props.salePointId; }
  get playerId(): string { return this.props.playerId; }
  get numbers(): string[] { return this.props.numbers; }
  get amountPerNumber(): number { return this.props.amountPerNumber; }
  get totalAmount(): number { return this.props.totalAmount; }
  get winningNumber(): string { return this.props.winningNumber; }
  get isWin(): boolean { return this.props.isWin; }
  get prize(): number { return this.props.prize; }
  get winPercentBps(): number { return this.props.winPercentBps; }
  get prizeMultiplier(): number { return this.props.prizeMultiplier; }
  get createdAt(): Date { return this.props.createdAt; }

  /** Resultado neto para la casa: lo apostado menos lo pagado. */
  get houseNet(): number {
    return this.props.totalAmount - this.props.prize;
  }
}
