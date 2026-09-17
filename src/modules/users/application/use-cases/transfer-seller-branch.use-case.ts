import { Inject, Injectable } from '@nestjs/common';

import { UseCase } from '../../../../shared/application/use-case';
import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error';
import {
  SALE_POINTS_REPOSITORY,
  type SalePointsRepository,
} from '../../../sale-points/domain/repositories/sale-points.repository';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../../domain/repositories/users.repository';
import { UserRole } from '../../domain/value-objects/user-role';
import { toUserOutput, type UserOutput } from '../dtos/user.output';

export interface TransferSellerBranchInput {
  userId: string;
  newSalePointId: string;
}

@Injectable()
export class TransferSellerBranch
  implements UseCase<TransferSellerBranchInput, UserOutput>
{
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(SALE_POINTS_REPOSITORY)
    private readonly salePoints: SalePointsRepository,
  ) {}

  async execute(input: TransferSellerBranchInput): Promise<UserOutput> {
    const user = await this.users.findById(input.userId);
    if (!user) throw new NotFoundError('User', input.userId);

    if (user.role !== UserRole.SELLER) {
      throw new ValidationError(
        'Solo se puede transferir de sucursal a vendedores',
      );
    }

    if (user.salePointId === input.newSalePointId) {
      throw new ValidationError(
        'El vendedor ya pertenece a esa sucursal',
      );
    }

    const targetBranch = await this.salePoints.findById(input.newSalePointId);
    if (!targetBranch) {
      throw new NotFoundError('SalePoint', input.newSalePointId);
    }

    await this.users.transferBranch(input.userId, input.newSalePointId);

    const updated = await this.users.findById(input.userId);
    return toUserOutput(updated!);
  }
}
