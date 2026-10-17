import { ValidationError } from '../../../../shared/domain/errors/domain.error';

/**
 * Casillas de una ruleta americana: `0`, `00` y del `1` al `36`. Son 38 en
 * total, y ese número es el que fija la probabilidad "honesta" de acertar
 * un número: 1/38 = 2.63%.
 *
 * Se guardan como string y no como number porque `0` y `00` son casillas
 * DISTINTAS que colapsarían al mismo valor numérico.
 */
export const ROULETTE_POCKETS: readonly string[] = Object.freeze([
  '0',
  '00',
  ...Array.from({ length: 36 }, (_, i) => String(i + 1)),
]);

export const ROULETTE_POCKET_COUNT = ROULETTE_POCKETS.length; // 38

/** Probabilidad real de una ruleta de 38 casillas, en basis points. */
export const FAIR_WIN_PERCENT_BPS = Math.round((10_000 * 1) / ROULETTE_POCKET_COUNT); // 263

export class RouletteNumber {
  private constructor(public readonly value: string) {}

  static parse(raw: string): RouletteNumber {
    const normalized = raw.trim();
    if (!ROULETTE_POCKETS.includes(normalized)) {
      throw new ValidationError(
        `"${raw}" no es una casilla válida (0, 00, 1-36)`,
      );
    }
    return new RouletteNumber(normalized);
  }

  /**
   * Valida y deduplica una selección. Se rechaza la selección vacía y la
   * que cubre las 38 casillas: apostar a todas no es una jugada, es pedir
   * el premio — y con cualquier multiplicador menor a 38 el jugador
   * perdería siempre, lo que haría ver al juego como roto.
   */
  static parseSelection(raw: string[]): string[] {
    const parsed = raw.map((n) => RouletteNumber.parse(n).value);
    const unique = Array.from(new Set(parsed));
    if (unique.length === 0) {
      throw new ValidationError('Hay que elegir al menos un número');
    }
    if (unique.length >= ROULETTE_POCKET_COUNT) {
      throw new ValidationError(
        'No se puede apostar a todas las casillas a la vez',
      );
    }
    return unique;
  }
}
