import { Inject, Injectable } from '@nestjs/common';

import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../../domain/repositories/users.repository';
import { UserRole } from '../../domain/value-objects/user-role';

export interface GetSyncPreviewOutput {
  ticketCount: number;
  movementCount: number;
}

@Injectable()
export class GetSyncPreview {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
  ) {}

  async execute(userId: string): Promise<GetSyncPreviewOutput> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    if (user.role !== UserRole.SELLER) {
      throw new ValidationError('Solo se puede sincronizar vendedores');
    }

    if (!user.salePointId) {
      throw new ValidationError(
        'El vendedor no tiene sucursal asignada. Asígnale una antes de sincronizar.',
      );
    }

    return this.users.getSyncCounts(userId, user.salePointId);
  }
}
