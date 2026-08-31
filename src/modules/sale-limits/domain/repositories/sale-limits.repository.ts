import { SaleLimit } from '../entities/sale-limit.entity';

export const SALE_LIMITS_REPOSITORY = Symbol('SALE_LIMITS_REPOSITORY');

export interface FindSaleLimitsFilters {
  /** Restrict to these sucursales (partner scoping). Empty = no rows. */
  salePointIds?: string[];
}

export interface SaleLimitsRepository {
  save(limit: SaleLimit): Promise<void>;
  findById(id: string): Promise<SaleLimit | null>;
  findByGameAndSalePoint(
    gameId: string,
    salePointId: string,
  ): Promise<SaleLimit | null>;
  findMany(filters: FindSaleLimitsFilters): Promise<SaleLimit[]>;
  delete(id: string): Promise<void>;
}
