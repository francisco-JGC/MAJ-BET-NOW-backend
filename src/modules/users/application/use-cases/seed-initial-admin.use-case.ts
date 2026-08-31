import { Inject, Injectable, Logger } from '@nestjs/common';

import { User } from '../../domain/entities/user.entity';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../../domain/repositories/users.repository';
import { UserRole } from '../../domain/value-objects/user-role';
import { PASSWORD_HASHER, type PasswordHasher } from '../ports/password-hasher.port';

/**
 * Resultado del intento de seed:
 *  - `created`: admin nuevo insertado en la DB.
 *  - `already_exists`: ya había al menos un admin, no se hizo nada.
 *  - `no_config`: faltaban env vars (usuario decidió crear el admin
 *    manualmente por SQL o desde otro flujo).
 *  - `taken`: el username configurado ya existe (probablemente asignado a
 *    otro rol) — no se creó el admin.
 */
export type SeedInitialAdminResult =
  | 'created'
  | 'already_exists'
  | 'no_config'
  | 'taken';

export interface SeedInitialAdminInput {
  username: string | null;
  password: string | null;
  name: string | null;
}

/**
 * Crea el primer admin del sistema al arrancar la app, siempre que no
 * exista ninguno todavía. Idempotente: en arranques subsiguientes
 * detecta que ya hay admin y no hace nada. Las credenciales vienen por
 * env vars (`INITIAL_ADMIN_USERNAME` / `_PASSWORD` / `_NAME`), lo que
 * permite hacer el primer bootstrap en Railway sin abrir psql.
 */
@Injectable()
export class SeedInitialAdmin {
  private readonly logger = new Logger(SeedInitialAdmin.name);

  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: SeedInitialAdminInput): Promise<SeedInitialAdminResult> {
    // Sin los tres campos no arrancamos — el operador está haciendo el
    // setup por otro medio (SQL manual, panel, etc.).
    if (!input.username || !input.password || !input.name) {
      return 'no_config';
    }

    // Corte principal: si ya hay algún admin, no tocamos nada. Cubre
    // deploys sucesivos y evita que rotar las env vars en Railway cree
    // usuarios paralelos por accidente.
    const adminCount = await this.users.count({ role: UserRole.ADMIN });
    if (adminCount > 0) return 'already_exists';

    // Puede pasar que exista un usuario con ese username pero con otro
    // rol (por ejemplo, un seller viejo llamado "admin"). No lo pisamos.
    const collision = await this.users.findByUsername(input.username);
    if (collision) {
      this.logger.warn(
        `INITIAL_ADMIN_USERNAME="${input.username}" ya está tomado por otro rol — no creo admin.`,
      );
      return 'taken';
    }

    const hashed = await this.hasher.hash(input.password);
    const admin = User.create({
      username: input.username,
      hashedPassword: hashed,
      name: input.name,
      role: UserRole.ADMIN,
      phone: null,
      address: null,
      nationalId: null,
      paymentPercentage: null,
      salePointId: null,
      createdById: SeedInitialAdmin.NIL_UUID,
    });
    await this.users.save(admin);
    this.logger.log(
      `Initial admin "${input.username}" created (nadie más lo hará mientras exista un admin).`,
    );
    return 'created';
  }
}
