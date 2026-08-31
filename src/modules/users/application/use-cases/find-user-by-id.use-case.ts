import { Inject, Injectable } from '@nestjs/common';

import { UseCase } from '../../../../shared/application/use-case';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error';
import { USERS_REPOSITORY, type UsersRepository } from '../../domain/repositories/users.repository';
import { toUserOutput, type UserOutput } from '../dtos/user.output';

@Injectable()
export class FindUserById implements UseCase<string, UserOutput> {
  constructor(@Inject(USERS_REPOSITORY) private readonly users: UsersRepository) {}

  async execute(id: string): Promise<UserOutput> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('User', id);
    return toUserOutput(user);
  }
}
