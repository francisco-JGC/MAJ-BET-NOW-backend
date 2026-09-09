import type { SaleLimitBySellerNumber } from '../entities/sale-limit-by-seller-number.entity';

export const SALE_LIMITS_BY_SELLER_NUMBER_REPOSITORY = Symbol(
  'SALE_LIMITS_BY_SELLER_NUMBER_REPOSITORY',
);

export interface SellerQuotaRow {
  sellerId: string;
  amount: number;
}

export interface SaleLimitsBySellerNumberRepository {
  save(entity: SaleLimitBySellerNumber): Promise<void>;
  findById(id: string): Promise<SaleLimitBySellerNumber | null>;
  /** Todas las cuotas de una sucursal (para la UI de config). */
  findBySalePoint(salePointId: string, gameId?: string): Promise<SaleLimitBySellerNumber[]>;
  findByKey(
    sellerId: string,
    gameId: string,
    label: string,
  ): Promise<SaleLimitBySellerNumber | null>;
  delete(id: string): Promise<void>;
  /**
   * Devuelve `sellerId -> amount` para (salePoint, game, label). Se usa
   * al validar el upsert (suma ≤ tope) y al enforce logic para saber
   * cuánto le corresponde al seller que está vendiendo.
   */
  quotasFor(
    salePointId: string,
    gameId: string,
    label: string,
  ): Promise<Map<string, number>>;
  /**
   * Cuota específica del vendedor para (game, label) — atajo para el
   * enforce del create-ticket, donde ya conocemos al seller.
   */
  findQuotaForSeller(
    sellerId: string,
    gameId: string,
    label: string,
  ): Promise<number | null>;
  /**
   * Cuotas de TODOS los vendedores para un conjunto de labels en un
   * solo roundtrip. Devuelve `label -> (sellerId -> amount)`. Reemplaza
   * el bucle de N llamadas a `quotasFor` en create-ticket — crítico para
   * rendimiento bajo carga concurrente (500 vendedores).
   */
  quotasForLabels(
    salePointId: string,
    gameId: string,
    labels: string[],
  ): Promise<Map<string, Map<string, number>>>;
}
