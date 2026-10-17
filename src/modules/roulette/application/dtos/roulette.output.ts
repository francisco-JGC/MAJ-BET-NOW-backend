import type { RouletteConfig } from '../../domain/entities/roulette-config.entity';
import type { RoulettePlay } from '../../domain/entities/roulette-play.entity';

export interface RouletteConfigOutput {
  id: string;
  salePointId: string | null;
  winPercentBps: number;
  prizeMultiplier: number;
  /** Retorno al jugador en basis points. >10000 significa casa perdiendo. */
  rtpBps: number;
  updatedAt: Date;
}

export const toRouletteConfigOutput = (c: RouletteConfig): RouletteConfigOutput => ({
  id: c.id,
  salePointId: c.salePointId,
  winPercentBps: c.winPercentBps,
  prizeMultiplier: c.prizeMultiplier,
  rtpBps: c.rtpBps,
  updatedAt: c.updatedAt,
});

export interface RoulettePlayOutput {
  id: string;
  salePointId: string;
  playerId: string;
  numbers: string[];
  amountPerNumber: number;
  totalAmount: number;
  winningNumber: string;
  isWin: boolean;
  prize: number;
  winPercentBps: number;
  prizeMultiplier: number;
  isTest: boolean;
  createdAt: Date;
}

export const toRoulettePlayOutput = (p: RoulettePlay): RoulettePlayOutput => ({
  id: p.id,
  salePointId: p.salePointId,
  playerId: p.playerId,
  numbers: p.numbers,
  amountPerNumber: p.amountPerNumber,
  totalAmount: p.totalAmount,
  winningNumber: p.winningNumber,
  isWin: p.isWin,
  prize: p.prize,
  winPercentBps: p.winPercentBps,
  prizeMultiplier: p.prizeMultiplier,
  isTest: p.isTest,
  createdAt: p.createdAt,
});
