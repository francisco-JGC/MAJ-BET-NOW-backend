import type { RoulettePlay } from '../entities/roulette-play.entity';

export const ROULETTE_PLAYS_REPOSITORY = Symbol('ROULETTE_PLAYS_REPOSITORY');

export interface ListRoulettePlaysFilter {
  salePointIds?: string[];
  playerId?: string;
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
}

export interface RoulettePlayTotals {
  plays: number;
  wins: number;
  wagered: number;
  paid: number;
}

export interface RoulettePlaysRepository {
  save(play: RoulettePlay): Promise<void>;
  list(filter: ListRoulettePlaysFilter): Promise<{
    items: RoulettePlay[];
    total: number;
  }>;
  /** Agregados del mismo filtro, para la cabecera del historial. */
  totals(filter: Omit<ListRoulettePlaysFilter, 'limit' | 'offset'>): Promise<RoulettePlayTotals>;
}
