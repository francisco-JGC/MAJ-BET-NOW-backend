import { DrawResult } from '../../../domain/entities/draw-result.entity';
import { DrawResultOrmEntity } from '../entities/draw-result.orm-entity';

export class DrawResultMapper {
  static toDomain(orm: DrawResultOrmEntity): DrawResult {
    return DrawResult.restore(orm.id, {
      gameId: orm.gameId,
      drawAt: orm.drawAt,
      winningNumber: orm.winningNumber,
      recordedById: orm.recordedById,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(result: DrawResult): DrawResultOrmEntity {
    const entity = new DrawResultOrmEntity();
    entity.id = result.id;
    entity.gameId = result.gameId;
    entity.drawAt = result.drawAt;
    entity.winningNumber = result.winningNumber;
    entity.recordedById = result.recordedById;
    entity.createdAt = result.createdAt;
    entity.updatedAt = result.updatedAt;
    return entity;
  }
}
