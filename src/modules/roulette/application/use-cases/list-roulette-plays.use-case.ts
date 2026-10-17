import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import { PartnerScopeService } from '../../../sale-points/application/services/partner-scope.service';
import { UserRole } from '../../../users/domain/value-objects/user-role';
import {
  ROULETTE_PLAYS_REPOSITORY,
  type RoulettePlaysRepository,
  type RoulettePlayTotals,
} from '../../domain/repositories/roulette-plays.repository';
import {
  toRoulettePlayOutput,
  type RoulettePlayOutput,
} from '../dtos/roulette.output';

export interface ListRoulettePlaysInput {
  requesterId: string;
  requesterRole: UserRole;
  salePointId?: string;
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
  /** Incluir jugadas de prueba. Por defecto false. */
  includeTest?: boolean;
}

export interface ListRoulettePlaysOutput {
  items: RoulettePlayOutput[];
  total: number;
  totals: RoulettePlayTotals;
}

@Injectable()
export class ListRoulettePlays
  implements UseCase<ListRoulettePlaysInput, ListRoulettePlaysOutput>
{
  constructor(
    @Inject(ROULETTE_PLAYS_REPOSITORY)
    private readonly repo: RoulettePlaysRepository,
    private readonly scope: PartnerScopeService,
  ) {}

  async execute(input: ListRoulettePlaysInput): Promise<ListRoulettePlaysOutput> {
    // Mismo invariante que el resto del sistema: un socio solo ve sus
    // sucursales, y un vendedor solo sus propias jugadas.
    let salePointIds: string[] | undefined;
    let playerId: string | undefined;

    if (input.requesterRole === UserRole.SELLER) {
      playerId = input.requesterId;
    } else if (input.requesterRole === UserRole.PARTNER) {
      const allowed = await this.scope.getAccessibleSalePointIds(
        input.requesterId,
        input.requesterRole,
      );
      salePointIds = input.salePointId
        ? allowed.filter((id) => id === input.salePointId)
        : allowed;
    } else if (input.salePointId) {
      salePointIds = [input.salePointId];
    }

    const filter = {
      salePointIds,
      playerId,
      from: input.from,
      to: input.to,
      includeTest: input.includeTest ?? false,
    };

    const [page, totals] = await Promise.all([
      this.repo.list({ ...filter, limit: input.limit, offset: input.offset }),
      this.repo.totals(filter),
    ]);

    return {
      items: page.items.map(toRoulettePlayOutput),
      total: page.total,
      totals,
    };
  }
}
