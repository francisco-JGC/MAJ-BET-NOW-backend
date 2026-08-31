# MajbetNow Backend

API del sistema MajbetNow. **NestJS + TypeORM + PostgreSQL** con arquitectura **hexagonal + DDD**.

## Requisitos

- Node.js 20+ (probado en 26)
- Docker + Docker Compose

## Puesta en marcha (primera vez)

```bash
# 1. Instalar deps
npm install

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Levantar PostgreSQL
docker compose up -d postgres

# 4. Correr migraciones
npm run migration:run

# 5. Levantar la app en modo dev
npm run start:dev

# 6. Crear el primer administrador (una sola vez)
curl -X POST http://localhost:3000/api/users/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","name":"Administrador"}'
```

API expuesta en `http://localhost:3000/api`. PostgreSQL en `localhost:5435`.

## Arquitectura

**Hexagonal + DDD**, tres capas por *bounded context*:

- **`domain/`** — reglas puras. Entities, Value Objects, agregados, interfaces de repositorio (ports), domain errors. **No importa nada de Nest / TypeORM / HTTP**.
- **`application/`** — orquesta el dominio. Use cases (uno por acción), DTOs, ports para servicios externos. Depende **solo de `domain/`**.
- **`infrastructure/`** — implementa los ports. TypeORM entities + repositorios, controllers HTTP, mappers, gateways externos, JWT, bcrypt, etc.

Regla de dependencia: `infrastructure ──▶ application ──▶ domain`.

## Estructura

```
src/
├── main.ts                                     # bootstrap + ValidationPipe + prefix /api
├── app.module.ts                               # raíz, registra APP_FILTER global
│
├── shared/
│   ├── domain/
│   │   ├── entity.ts / aggregate-root.ts / value-object.ts / domain-event.ts
│   │   └── errors/domain.error.ts              # DomainError + NotFoundError + ValidationError
│   ├── application/use-case.ts
│   └── infrastructure/
│       ├── config/env.config.ts                # Joi schema + typed AppConfig
│       ├── http/domain-exception.filter.ts     # DomainError → HTTP (400/404/500)
│       └── persistence/
│           ├── database.module.ts              # TypeORM.forRootAsync
│           ├── data-source.ts                  # DataSource para el CLI de migraciones
│           └── migrations/                     # generated migrations
│
└── modules/
    ├── users/                # gestión de usuarios (admin + seller)
    ├── auth/                 # login, JWT, guards, decoradores
    └── sale-points/          # puestos de venta (tenants)
```

## Módulos existentes

### `users` — gestión de usuarios

Roles:
- **`admin`** — administra el sistema.
- **`seller`** — vendedor de un puesto de venta.

Endpoints:
- `POST /api/users/bootstrap` — **público**, crea el primer admin. Falla con 403 si ya existe cualquier usuario.
- `POST /api/users` — **@Roles(admin)** — crea admin o seller.
- `GET /api/users/:id` — **@Roles(admin)**.

### `auth` — autenticación JWT

- Estrategia: **JWT** (`@nestjs/jwt` + `passport-jwt`).
- Password hash: **bcrypt** (10 rounds).
- Token expira según `JWT_EXPIRES_IN` (default 24h).

Guards globales (registrados con `APP_GUARD`):
- **`JwtAuthGuard`** — todos los endpoints requieren JWT válido, salvo los marcados con `@Public()`.
- **`RolesGuard`** — chequea `@Roles(UserRole.X)` contra el rol del JWT.

Decoradores disponibles:
```ts
@Public()                            // No requiere autenticación
@Roles(UserRole.ADMIN)               // Restringe por rol
@CurrentUser() user: RequestUser     // Inyecta { id, username, role }
```

Endpoints:
- `POST /api/auth/login` — **@Public()** — recibe `{ username, password }`, devuelve `{ accessToken, user }`.
- `GET /api/auth/me` — devuelve el `RequestUser` del token.

### `sale-points` — puestos de venta

Cada puesto de venta es un **tenant**: pertenece a un vendedor y todas sus ventas se atribuyen a ese puesto. Un vendedor puede tener uno o varios puestos.

Modelo `SalePoint`:
- `id` uuid PK
- `name` varchar(120)
- `code` varchar(30) unique
- `owner_id` uuid FK a `users(id)` **onDelete: RESTRICT** — no se borra un usuario con puestos activos
- `is_active` boolean default `true`
- `created_at`, `updated_at` timestamptz

Reglas de negocio:
- El `owner` **debe** tener rol `seller`. Si un admin intenta ser dueño → **400 ValidationError**.
- El `code` es único (ej. `PV-001`, `SUCURSAL-CENTRO`).

Endpoints:
- `POST /api/sale-points` — **@Roles(admin)** — crear puesto asignado a un vendedor.
- `GET /api/sale-points` — **@Roles(admin)** — lista todos.
- `GET /api/sale-points/mine` — autenticado — puestos del usuario actual (para vendedores).
- `PATCH /api/sale-points/:id/toggle` — **@Roles(admin)** — activar/desactivar.

## Migraciones

`synchronize` está **deshabilitado** en todos los entornos. Los cambios de esquema van vía migraciones.

```bash
# Generar migración basada en cambios detectados vs DB actual
npm run migration:generate -- src/shared/infrastructure/persistence/migrations/NombreMigracion

# Crear migración vacía (para escribir SQL manual)
npm run migration:create -- src/shared/infrastructure/persistence/migrations/NombreMigracion

# Aplicar todas las migraciones pendientes
npm run migration:run

# Revertir la última
npm run migration:revert

# Ver estado
npm run migration:show

# Dropear el schema entero (⚠️ destructivo)
npm run schema:drop
```

Las migraciones viven en `src/shared/infrastructure/persistence/migrations/` y se llevan un timestamp automático (`1783752169426-InitialSchema.ts`).

**Flujo típico** para un cambio de esquema:
1. Editar `*.orm-entity.ts` (añadir columnas, índices, tablas).
2. Levantar la DB local con el esquema **anterior** aplicado.
3. `npm run migration:generate -- src/shared/infrastructure/persistence/migrations/DescripcionCorta` → TypeORM compara y genera SQL.
4. Revisar el archivo generado.
5. `npm run migration:run` para aplicar.
6. Commit del archivo de migración junto al cambio de código.

## Comandos útiles

```bash
# Desarrollo (watch)
npm run start:dev

# Producción
npm run build && npm run start:prod

# Lint + tests
npm run lint
npm run test

# Base de datos (Docker)
docker compose up -d postgres     # arrancar
docker compose logs -f postgres   # ver logs
docker compose down               # detener
docker compose down -v            # detener + borrar datos (⚠️)
```

## Convenciones

- **Un módulo Nest por bounded context** — se importa desde `AppModule`.
- **Los repositorios son interfaces en `domain/`** — binding con `useClass` en el `<context>.module.ts`:
  ```ts
  { provide: USERS_REPOSITORY, useClass: TypeOrmUsersRepository }
  ```
- **Los use cases dependen del token del repositorio**, nunca de la implementación TypeORM.
- **Entidades del dominio no se exponen en HTTP**. Los controllers usan DTOs.
- **DTOs con `class-validator`** — el `ValidationPipe` global rechaza payloads con campos extra o inválidos.
- **`DomainError` → HTTP** vía `DomainExceptionFilter` registrado como `APP_FILTER`:
  - `ValidationError` → 400
  - `NotFoundError` → 404
  - Otros errores → 500 (loggeados)

## Próximos pasos

- `tickets` — ventas y boletos, asociadas a un `sale_point_id` (multi-tenant real).
- Endpoint `POST /api/auth/login` que devuelva también los puestos del vendedor.
- Refresh tokens.
- Migraciones seed (juegos autorizados iniciales).
