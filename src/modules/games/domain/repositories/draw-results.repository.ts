import type { DrawResult } from '../entities/draw-result.entity';

export const DRAW_RESULTS_REPOSITORY = Symbol('DRAW_RESULTS_REPOSITORY');

export interface DrawResultsFilters {
  gameId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
  /**
   * Excluir tipos de juego del listado. Se usa para dejar afuera la
   * ruleta: cada tirada genera su propio sorteo, así que en la pantalla de
   * resultados sepultaría a los sorteos reales. Sigue contando en
   * facturas, ganadores y la cuenta del vendedor.
   */
  excludeTypes?: string[];
}

export interface DrawResultsRepository {
  save(result: DrawResult): Promise<void>;
  findById(id: string): Promise<DrawResult | null>;
  findByGameAndDraw(gameId: string, drawAt: Date): Promise<DrawResult | null>;
  findMany(filters: DrawResultsFilters): Promise<DrawResult[]>;
  delete(id: string): Promise<void>;
}
