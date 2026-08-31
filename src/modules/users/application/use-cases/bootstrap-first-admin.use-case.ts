import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { UseCase } from '../../../../shared/application/use-case';
import { USERS_REPOSITORY, type UsersRepository } from '../../domain/repositories/users.repository';
import { UserRole } from '../../domain/value-objects/user-role';
import { type UserOutput } from '../dtos/user.output';
import { CreateUser } from './create-user.use-case';

export interface BootstrapFirstAdminInput {
  username: string;
  password: string;
  name: string;
}

@Injectable()
export class BootstrapFirstAdmin implements UseCase<BootstrapFirstAdminInput, UserOutput> {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    private readonly createUser: CreateUser,
  ) {}

  async execute(input: BootstrapFirstAdminInput): Promise<UserOutput> {
    const total = await this.users.countAll();
    if (total > 0) {
      throw new ForbiddenException('Bootstrap already completed');
    }
    // Bootstrap runs before any user exists, so there is no real
    // requester. Impersonate an admin to satisfy CreateUser's contract.
    return this.createUser.execute({
      ...input,
      role: UserRole.ADMIN,
      requesterId: '00000000-0000-0000-0000-000000000000',
      requesterRole: UserRole.ADMIN,
    });
  }
}
