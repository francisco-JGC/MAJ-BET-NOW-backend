import type { Game } from '../entities/game.entity';

export const GAMES_REPOSITORY = Symbol('GAMES_REPOSITORY');

export interface GamesRepository {
  save(game: Game): Promise<void>;
  findById(id: string): Promise<Game | null>;
  findBySlug(slug: string): Promise<Game | null>;
  findAll(options: { onlyActive: boolean }): Promise<Game[]>;
  count(): Promise<number>;
}
