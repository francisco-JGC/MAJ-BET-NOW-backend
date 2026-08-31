import 'dotenv/config';
import { join } from 'path';

import { DataSource, type DataSourceOptions } from 'typeorm';

/**
 * The TypeORM CLI loads this file both in dev (`ts-node`, reading .ts
 * sources) and in prod (compiled to `dist/.../data-source.js`, reading .js).
 * We pick the extension from `__filename` so the same config works in both
 * without duplicating it.
 */
const isCompiled = __filename.endsWith('.js');
const ext = isCompiled ? 'js' : 'ts';

const entitiesGlob = join(
  __dirname,
  '..',
  '..',
  '..',
  'modules',
  '**',
  `*.orm-entity.${ext}`,
);
const migrationsGlob = join(__dirname, 'migrations', `*.${ext}`);

function baseConnection(): Partial<DataSourceOptions> {
  const url = process.env.DATABASE_URL;
  if (url) {
    // Railway (and most hosted Postgres) exposes DATABASE_URL and requires
    // SSL. `rejectUnauthorized: false` because Railway's cert chain isn't in
    // Node's default CA bundle.
    return { url, ssl: { rejectUnauthorized: false } };
  }
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...baseConnection(),
  entities: [entitiesGlob],
  migrations: [migrationsGlob],
  synchronize: false,
  logging: ['error', 'warn'],
} as DataSourceOptions);
