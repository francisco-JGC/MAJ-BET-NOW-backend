import { RouletteConfig } from '../../../domain/entities/roulette-config.entity';
import { RoulettePlay } from '../../../domain/entities/roulette-play.entity';
import { RouletteConfigOrmEntity } from '../entities/roulette-config.orm-entity';
import { RoulettePlayOrmEntity } from '../entities/roulette-play.orm-entity';

export class RouletteConfigMapper {
  static toDomain(orm: RouletteConfigOrmEntity): RouletteConfig {
    return RouletteConfig.rehydrate(orm.id, {
      salePointId: orm.salePointId,
      winPercentBps: orm.winPercentBps,
      prizeMultiplier: orm.prizeMultiplier,
      testMode: orm.testMode,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(config: RouletteConfig): RouletteConfigOrmEntity {
    const entity = new RouletteConfigOrmEntity();
    entity.id = config.id;
    entity.salePointId = config.salePointId;
    entity.winPercentBps = config.winPercentBps;
    entity.prizeMultiplier = config.prizeMultiplier;
    entity.testMode = config.testMode;
    entity.createdAt = config.createdAt;
    entity.updatedAt = config.updatedAt;
    return entity;
  }
}

export class RoulettePlayMapper {
  static toDomain(orm: RoulettePlayOrmEntity): RoulettePlay {
    return RoulettePlay.rehydrate(orm.id, {
      salePointId: orm.salePointId,
      playerId: orm.playerId,
      bets: orm.bets,
      totalAmount: orm.totalAmount,
      winningNumber: orm.winningNumber,
      isWin: orm.isWin,
      prize: orm.prize,
      winPercentBps: orm.winPercentBps,
      prizeMultiplier: orm.prizeMultiplier,
      isTest: orm.isTest,
      createdAt: orm.createdAt,
    });
  }

  static toOrm(play: RoulettePlay): RoulettePlayOrmEntity {
    const entity = new RoulettePlayOrmEntity();
    entity.id = play.id;
    entity.salePointId = play.salePointId;
    entity.playerId = play.playerId;
    entity.bets = play.bets;
    entity.totalAmount = play.totalAmount;
    entity.winningNumber = play.winningNumber;
    entity.isWin = play.isWin;
    entity.prize = play.prize;
    entity.winPercentBps = play.winPercentBps;
    entity.prizeMultiplier = play.prizeMultiplier;
    entity.isTest = play.isTest;
    entity.createdAt = play.createdAt;
    return entity;
  }
}
