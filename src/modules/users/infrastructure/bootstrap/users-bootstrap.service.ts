import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../../../shared/infrastructure/config/env.config';
import { SeedInitialAdmin } from '../../application/use-cases/seed-initial-admin.use-case';

/**
 * Dispara `SeedInitialAdmin` cuando arranca el app. Mirror del patrón que
 * ya usa `games-bootstrap.service.ts` — mantenerlo consistente hace que
 * los "seeds de arranque" sean predecibles al debuggear.
 */
@Injectable()
export class UsersBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersBootstrapService.name);

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly seedInitialAdmin: SeedInitialAdmin,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const initial = this.config.get('initialAdmin', { infer: true });
    const result = await this.seedInitialAdmin.execute(initial);
    switch (result) {
      case 'created':
        // El use-case ya loggeó el éxito con el username.
        break;
      case 'already_exists':
        this.logger.log('Initial admin already present, skipping');
        break;
      case 'no_config':
        // Sin env vars — silencio deliberado. El operador está haciendo
        // el bootstrap manual, no hay nada que reportar.
        break;
      case 'taken':
        // El use-case ya loggeó el warning con el detalle.
        break;
    }
  }
}
