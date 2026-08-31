import type { DrawResult } from '../entities/draw-result.entity';

export const DRAW_RESULTS_REPOSITORY = Symbol('DRAW_RESULTS_REPOSITORY');

export interface DrawResultsFilters {
  gameId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface DrawResultsRepository {
  save(result: DrawResult): Promise<void>;
  findById(id: string): Promise<DrawResult | null>;
  findByGameAndDraw(gameId: string, drawAt: Date): Promise<DrawResult | null>;
  findMany(filters: DrawResultsFilters): Promise<DrawResult[]>;
  delete(id: string): Promise<void>;
}
