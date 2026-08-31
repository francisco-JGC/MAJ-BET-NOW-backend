import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { type AppConfig } from '../../shared/infrastructure/config/env.config';
import { UsersModule } from '../users/users.module';
import { TOKEN_SERVICE } from './application/ports/token-service.port';
import { Login } from './application/use-cases/login.use-case';
import { RefreshAccessToken } from './application/use-cases/refresh-access-token.use-case';
import { AuthController } from './infrastructure/http/controllers/auth.controller';
import { JwtAuthGuard } from './infrastructure/http/guards/jwt-auth.guard';
import { RolesGuard } from './infrastructure/http/guards/roles.guard';
import { JwtTokenService } from './infrastructure/services/jwt-token.service';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const jwt = config.get('jwt', { infer: true });
        return {
          secret: jwt.secret,
          signOptions: { expiresIn: jwt.expiresIn as unknown as number },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    Login,
    RefreshAccessToken,
    JwtStrategy,
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
