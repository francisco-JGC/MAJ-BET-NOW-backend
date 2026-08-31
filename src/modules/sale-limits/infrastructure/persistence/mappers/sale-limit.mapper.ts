import { SaleLimit } from '../../../domain/entities/sale-limit.entity';
import { SaleLimitOrmEntity } from '../entities/sale-limit.orm-entity';

export class SaleLimitMapper {
  static toDomain(orm: SaleLimitOrmEntity): SaleLimit {
    return SaleLimit.restore(orm.id, {
      gameId: orm.gameId,
      salePointId: orm.salePointId,
      amount: orm.amount,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(limit: SaleLimit): SaleLimitOrmEntity {
    const entity = new SaleLimitOrmEntity();
    entity.id = limit.id;
    entity.gameId = limit.gameId;
    entity.salePointId = limit.salePointId;
    entity.amount = limit.amount;
    entity.createdAt = limit.createdAt;
    entity.updatedAt = limit.updatedAt;
    return entity;
  }
}
