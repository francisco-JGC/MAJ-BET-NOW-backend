import { ValidationError } from '../../../../shared/domain/errors/domain.error';

import { RouletteNumber, ROULETTE_POCKET_COUNT } from './roulette-number';

/**
 * Una apuesta: una casilla con SU monto.
 *
 * Antes la jugada tenía un único `amountPerNumber` para toda la selección.
 * Con esto cada número lleva lo suyo, que es como se apuesta en una mesa
 * real: el cliente pone fichas distintas en casillas distintas.
 */
export interface RouletteBet {
  number: string;
  amount: number;
}

export class RouletteBets {
  /**
   * Valida la selección completa: casillas existentes, sin repetidos,
   * montos enteros positivos y al menos una apuesta.
   */
  static parse(raw: Array<{ number: string; amount: number }>): RouletteBet[] {
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new ValidationError('Hay que elegir al menos un número');
    }
    if (raw.length >= ROULETTE_POCKET_COUNT) {
      throw new ValidationError(
        'No se puede apostar a todas las casillas a la vez',
      );
    }

    const seen = new Set<string>();
    const bets: RouletteBet[] = [];
    for (const item of raw) {
      const number = RouletteNumber.parse(item.number).value;
      if (seen.has(number)) {
        throw new ValidationError(`El número ${number} está repetido`);
      }
      if (!Number.isInteger(item.amount) || item.amount < 1) {
        throw new ValidationError(
          `El monto del número ${number} debe ser un entero mayor a 0`,
        );
      }
      seen.add(number);
      bets.push({ number, amount: item.amount });
    }
    return bets;
  }

  static total(bets: RouletteBet[]): number {
    return bets.reduce((sum, b) => sum + b.amount, 0);
  }

  /** Monto apostado a una casilla puntual, o 0 si no se jugó. */
  static amountOf(bets: RouletteBet[], number: string): number {
    return bets.find((b) => b.number === number)?.amount ?? 0;
  }
}
