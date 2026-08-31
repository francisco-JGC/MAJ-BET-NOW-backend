import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CurrentUser } from '../../../../auth/infrastructure/http/decorators/current-user.decorator';
import { Public } from '../../../../auth/infrastructure/http/decorators/public.decorator';
import { Roles } from '../../../../auth/infrastructure/http/decorators/roles.decorator';
import { type RequestUser } from '../../../../auth/infrastructure/strategies/jwt.strategy';
import { BootstrapFirstAdmin } from '../../../application/use-cases/bootstrap-first-admin.use-case';
import { CreateUser } from '../../../application/use-cases/create-user.use-case';
import { FindUserById } from '../../../application/use-cases/find-user-by-id.use-case';
import {
  ListUsers,
  type ListUsersOutput,
} from '../../../application/use-cases/list-users.use-case';
import { UpdateUser } from '../../../application/use-cases/update-user.use-case';
import { UserOutput } from '../../../application/dtos/user.output';
import { UserRole } from '../../../domain/value-objects/user-role';
import { BootstrapAdminHttpDto } from '../dtos/bootstrap-admin-http.dto';
import { CreateUserHttpDto } from '../dtos/create-user-http.dto';
import { ListUsersQueryDto } from '../dtos/list-users-query.dto';
import { UpdateUserHttpDto } from '../dtos/update-user-http.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly createUser: CreateUser,
    private readonly findUserById: FindUserById,
    private readonly listUsers: ListUsers,
    private readonly updateUser: UpdateUser,
    private readonly bootstrapFirstAdmin: BootstrapFirstAdmin,
  ) {}

  @Post('bootstrap')
  @Public()
  bootstrap(@Body() dto: BootstrapAdminHttpDto): Promise<UserOutput> {
    return this.bootstrapFirstAdmin.execute(dto);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PARTNER)
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateUserHttpDto,
  ): Promise<UserOutput> {
    return this.createUser.execute({
      ...dto,
      requesterId: user.id,
      requesterRole: user.role,
    });
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PARTNER)
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListUsersQueryDto,
  ): Promise<ListUsersOutput> {
    return this.listUsers.execute({
      requesterId: user.id,
      requesterRole: user.role,
      role: query.role,
      search: query.search,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PARTNER)
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<UserOutput> {
    return this.findUserById.execute(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PARTNER)
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserHttpDto,
  ): Promise<UserOutput> {
    return this.updateUser.execute({
      id,
      ...dto,
      requesterId: user.id,
      requesterRole: user.role,
    });
  }
}
