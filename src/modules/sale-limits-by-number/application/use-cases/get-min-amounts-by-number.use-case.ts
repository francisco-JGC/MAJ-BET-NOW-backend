import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import { PartnerScopeService } from '../../../sale-points/application/services/partner-scope.service';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../../../users/domain/repositories/users.repository';
import { UserRole } from '../../../users/domain/value-objects/user-role';
import {
  SALE_LIMITS_BY_NUMBER_REPOSITORY,
  type SaleLimitsByNumberRepository,
} from '../../domain/repositories/sale-limits-by-number.repository';

export interface GetMinAmountsByNumberInput {
  requesterId: string;
  requesterRole: UserRole;
  gameId: string;
  salePointId: string;
}

/**
 * Returns a `label -> minAmount` map for all numbers in a (game, sucursal)
 * that have a configured minimum bet. Used by the mobile app to validate
 * amounts client-side before submitting a ticket.
 */
@Injectable()
export class GetMinAmountsByNumber
  implements UseCase<GetMinAmountsByNumberInput, Record<string, number>>
{
  constructor(
    @Inject(SALE_LIMITS_BY_NUMBER_REPOSITORY)
    private readonly limits: SaleLimitsByNumberRepository,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    private readonly scope: PartnerScopeService,
  ) {}

  async execute(
    input: GetMinAmountsByNumberInput,
  ): Promise<Record<string, number>> {
    if (input.requesterRole === UserRole.SELLER) {
      const seller = await this.users.findById(input.requesterId);
      if (!seller || seller.salePointId !== input.salePointId) {
        throw new ForbiddenException(
          'No puedes consultar límites fuera de tu sucursal',
        );
      }
    } else if (input.requesterRole === UserRole.PARTNER) {
      const owned = await this.scope.getAccessibleSalePointIds(
        input.requesterId,
        input.requesterRole,
      );
      if (!owned.includes(input.salePointId)) {
        throw new ForbiddenException('Esa sucursal no te pertenece');
      }
    }

    const map = await this.limits.mapForGame(input.salePointId, input.gameId);
    const result: Record<string, number> = {};
    for (const [label, cfg] of map) {
      if (cfg.minAmount != null) {
        result[label] = cfg.minAmount;
      }
    }
    return result;
  }
}
