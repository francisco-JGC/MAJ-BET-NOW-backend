import { Inject, Injectable } from '@nestjs/common';

import { UseCase } from '../../../../shared/application/use-case';
import { type User } from '../../domain/entities/user.entity';
import { USERS_REPOSITORY, type UsersRepository } from '../../domain/repositories/users.repository';

@Injectable()
export class FindUserByUsername implements UseCase<string, User | null> {
  constructor(@Inject(USERS_REPOSITORY) private readonly users: UsersRepository) {}

  execute(username: string): Promise<User | null> {
    return this.users.findByUsername(username);
  }
}
