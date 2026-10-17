import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';

import {
  ROULETTE_POCKETS,
  ROULETTE_POCKET_COUNT,
} from '../../domain/value-objects/roulette-number';

export interface SpinOutcome {
  winningNumber: string;
  isWin: boolean;
  /** Probabilidad efectiva de la jugada, en basis points. */
  effectiveWinBps: number;
}

const BPS = 10_000;

/**
 * Decide el resultado de un giro.
 *
 * El orden importa: primero se sortea SI gana, con la probabilidad que la
 * casa configuró, y recién después se elige qué casilla salió —
 * consistente con esa decisión. No al revés. Girar una ruleta uniforme y
 * mirar si pegó daría siempre 1/38 y haría inútil la perilla.
 *
 * La consecuencia es que la casilla que sale NO es uniforme: está sesgada
 * hacia (o en contra de) lo que el jugador eligió, según el porcentaje
 * configurado. Con `winPercentBps = 263` (1/38) el sesgo desaparece y el
 * juego es indistinguible de una ruleta honesta.
 *
 * Todo se resuelve en el servidor con `randomInt` de `crypto`: el cliente
 * solo recibe el resultado ya decidido, nunca participa en decidirlo.
 */
@Injectable()
export class SpinResolver {
  resolve(selected: string[], winPercentBps: number): SpinOutcome {
    const picked = new Set(selected);
    const losing = ROULETTE_POCKETS.filter((p) => !picked.has(p));

    // Probabilidad de la jugada = (nº de casillas elegidas) × (% por número),
    // topeada al 100%. Si el jugador cubrió tantas casillas que el producto
    // pasa de 1, o si ya no quedan casillas perdedoras, gana siempre.
    const effectiveWinBps = Math.min(BPS, selected.length * winPercentBps);
    const alwaysWins = losing.length === 0 || effectiveWinBps >= BPS;

    const isWin = alwaysWins || randomInt(0, BPS) < effectiveWinBps;

    const pool = isWin ? selected : losing;
    const winningNumber = pool[randomInt(0, pool.length)];

    return { winningNumber, isWin, effectiveWinBps };
  }

  /** Expuesto para que la web pueda mostrar el RTP antes de guardar. */
  static fairWinBpsFor(selectedCount: number): number {
    return Math.round((BPS * selectedCount) / ROULETTE_POCKET_COUNT);
  }
}
