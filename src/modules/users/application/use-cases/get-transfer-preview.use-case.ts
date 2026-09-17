import { Inject, Injectable } from '@nestjs/common';

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

export interface GetTransferPreviewInput {
  userId: string;
  newSalePointId: string;
}

export interface GetTransferPreviewOutput {
  ticketCount: number;
  movementCount: number;
}

@Injectable()
export class GetTransferPreview {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(SALE_POINTS_REPOSITORY)
    private readonly salePoints: SalePointsRepository,
  ) {}

  async execute(
    input: GetTransferPreviewInput,
  ): Promise<GetTransferPreviewOutput> {
    const user = await this.users.findById(input.userId);
    if (!user) throw new NotFoundError('User', input.userId);

    if (user.role !== UserRole.SELLER) {
      throw new ValidationError(
        'Solo se puede transferir de sucursal a vendedores',
      );
    }

    if (user.salePointId === input.newSalePointId) {
      throw new ValidationError('El vendedor ya pertenece a esa sucursal');
    }

    const targetBranch = await this.salePoints.findById(input.newSalePointId);
    if (!targetBranch) {
      throw new NotFoundError('SalePoint', input.newSalePointId);
    }

    return this.users.getTransferCounts(input.userId);
  }
}
