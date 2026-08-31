import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AppConfig } from '../../../../shared/infrastructure/config/env.config';
import { UserRole } from '../../../users/domain/value-objects/user-role';
import { TokenPayload } from '../../application/ports/token-service.port';

export interface RequestUser {
  id: string;
  username: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService<AppConfig, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt', { infer: true }).secret,
    });
  }

  validate(payload: TokenPayload): RequestUser {
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role as UserRole,
    };
  }
}
