import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { AuthOutput, RefreshOutput } from '../../../application/dtos/auth.output';
import { Login } from '../../../application/use-cases/login.use-case';
import { RefreshAccessToken } from '../../../application/use-cases/refresh-access-token.use-case';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { LoginHttpDto } from '../dtos/login-http.dto';
import { RefreshHttpDto } from '../dtos/refresh-http.dto';
import { type RequestUser } from '../../strategies/jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: Login,
    private readonly refreshUseCase: RefreshAccessToken,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginHttpDto): Promise<AuthOutput> {
    return this.loginUseCase.execute(dto);
  }

  // Public because the caller doesn't have a valid access token by the
  // time they call this — that's the whole point.
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshHttpDto): Promise<RefreshOutput> {
    return this.refreshUseCase.execute({ refreshToken: dto.refreshToken });
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser): RequestUser {
    return user;
  }
}
