import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common';

import { CurrentUser } from '../../../../auth/infrastructure/http/decorators/current-user.decorator';
import { Roles } from '../../../../auth/infrastructure/http/decorators/roles.decorator';
import type { RequestUser } from '../../../../auth/infrastructure/strategies/jwt.strategy';
import { UserRole } from '../../../../users/domain/value-objects/user-role';
import type {
  RouletteConfigOutput,
  RoulettePlayOutput,
} from '../../../application/dtos/roulette.output';
import { toRouletteConfigOutput } from '../../../application/dtos/roulette.output';
import {
  ListRoulettePlays,
  type ListRoulettePlaysOutput,
} from '../../../application/use-cases/list-roulette-plays.use-case';
import { PlayRoulette } from '../../../application/use-cases/play-roulette.use-case';
import { ResolveRouletteConfig } from '../../../application/use-cases/resolve-roulette-config.use-case';
import { UpsertRouletteConfig } from '../../../application/use-cases/upsert-roulette-config.use-case';
import {
  ROULETTE_POCKETS,
  FAIR_WIN_PERCENT_BPS,
} from '../../../domain/value-objects/roulette-number';
import {
  ListRoulettePlaysQueryDto,
  PlayRouletteHttpDto,
  UpsertRouletteConfigHttpDto,
} from '../dtos/roulette-http.dto';

@Controller('roulette')
export class RouletteController {
  constructor(
    private readonly playRoulette: PlayRoulette,
    private readonly listPlays: ListRoulettePlays,
    private readonly resolveConfig: ResolveRouletteConfig,
    private readonly upsertConfig: UpsertRouletteConfig,
  ) {}

  /** Tablero: las 38 casillas y la probabilidad honesta, para la app. */
  @Get('board')
  @Roles(UserRole.ADMIN, UserRole.PARTNER, UserRole.SELLER)
  board(): { pockets: string[]; fairWinPercentBps: number } {
    return {
      pockets: [...ROULETTE_POCKETS],
      fairWinPercentBps: FAIR_WIN_PERCENT_BPS,
    };
  }

  @Post('play')
  @Roles(UserRole.ADMIN, UserRole.PARTNER, UserRole.SELLER)
  play(
    @CurrentUser() user: RequestUser,
    @Body() dto: PlayRouletteHttpDto,
  ): Promise<RoulettePlayOutput> {
    return this.playRoulette.execute({
      salePointId: dto.salePointId,
      playerId: user.id,
      numbers: dto.numbers,
      amountPerNumber: dto.amountPerNumber,
    });
  }

  @Get('plays')
  @Roles(UserRole.ADMIN, UserRole.PARTNER, UserRole.SELLER)
  plays(
    @CurrentUser() user: RequestUser,
    @Query() query: ListRoulettePlaysQueryDto,
  ): Promise<ListRoulettePlaysOutput> {
    return this.listPlays.execute({
      requesterId: user.id,
      requesterRole: user.role,
      salePointId: query.salePointId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });
  }

  /** Config vigente de una sucursal (la suya, la global, o el default). */
  @Get('config')
  @Roles(UserRole.ADMIN, UserRole.PARTNER, UserRole.SELLER)
  async config(
    @Query('salePointId') salePointId: string,
  ): Promise<RouletteConfigOutput> {
    const config = await this.resolveConfig.execute(salePointId);
    return toRouletteConfigOutput(config);
  }

  // Solo admin: estas dos perillas definen cuánto gana o pierde la casa.
  @Put('config')
  @Roles(UserRole.ADMIN)
  setConfig(
    @Body() dto: UpsertRouletteConfigHttpDto,
  ): Promise<RouletteConfigOutput> {
    return this.upsertConfig.execute({
      salePointId: dto.salePointId ?? null,
      winPercentBps: dto.winPercentBps,
      prizeMultiplier: dto.prizeMultiplier,
      testMode: dto.testMode,
    });
  }
}
