import { SalePointGamePrize } from '../entities/sale-point-game-prize.entity';

export const SALE_POINT_GAME_PRIZES_REPOSITORY = Symbol(
  'SALE_POINT_GAME_PRIZES_REPOSITORY',
);

export interface SalePointGamePrizesRepository {
  save(prize: SalePointGamePrize): Promise<void>;
  findById(id: string): Promise<SalePointGamePrize | null>;
  findByGameAndSalePoint(
    gameId: string,
    salePointId: string,
  ): Promise<SalePointGamePrize | null>;
  findBySalePoint(salePointId: string): Promise<SalePointGamePrize[]>;
  delete(id: string): Promise<void>;
}
