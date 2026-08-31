import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SalePointsModule } from '../sale-points/sale-points.module';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { BootstrapFirstAdmin } from './application/use-cases/bootstrap-first-admin.use-case';
import { CreateUser } from './application/use-cases/create-user.use-case';
import { FindUserById } from './application/use-cases/find-user-by-id.use-case';
import { FindUserByUsername } from './application/use-cases/find-user-by-username.use-case';
import { ListUsers } from './application/use-cases/list-users.use-case';
import { SeedInitialAdmin } from './application/use-cases/seed-initial-admin.use-case';
import { UpdateUser } from './application/use-cases/update-user.use-case';
import { USERS_REPOSITORY } from './domain/repositories/users.repository';
import { UsersBootstrapService } from './infrastructure/bootstrap/users-bootstrap.service';
import { UsersController } from './infrastructure/http/controllers/users.controller';
import { UserOrmEntity } from './infrastructure/persistence/entities/user.orm-entity';
import { TypeOrmUsersRepository } from './infrastructure/persistence/repositories/typeorm-users.repository';
import { BcryptPasswordHasher } from './infrastructure/services/bcrypt-password-hasher';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserOrmEntity]),
    // SalePointsModule imports UsersModule for CreateSalePoint validation,
    // and UsersModule now depends on it for PartnerScopeService (used in
    // ListUsers to scope by sucursales). Break the cycle with forwardRef.
    forwardRef(() => SalePointsModule),
  ],
  controllers: [UsersController],
  providers: [
    { provide: USERS_REPOSITORY, useClass: TypeOrmUsersRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    CreateUser,
    FindUserById,
    FindUserByUsername,
    ListUsers,
    UpdateUser,
    BootstrapFirstAdmin,
    SeedInitialAdmin,
    UsersBootstrapService,
  ],
  exports: [FindUserByUsername, PASSWORD_HASHER, USERS_REPOSITORY],
})
export class UsersModule {}
