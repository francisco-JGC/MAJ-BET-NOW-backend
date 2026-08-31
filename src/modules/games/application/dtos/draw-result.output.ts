import type { DrawResult } from '../../domain/entities/draw-result.entity';

export interface DrawResultOutput {
  id: string;
  gameId: string;
  drawAt: Date;
  winningNumber: string;
  recordedById: string;
  createdAt: Date;
  updatedAt: Date;
}

export const toDrawResultOutput = (result: DrawResult): DrawResultOutput => ({
  id: result.id,
  gameId: result.gameId,
  drawAt: result.drawAt,
  winningNumber: result.winningNumber,
  recordedById: result.recordedById,
  createdAt: result.createdAt,
  updatedAt: result.updatedAt,
});
