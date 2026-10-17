import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Minijuego de ruleta: configuración y historial de jugadas.
 *
 * No usa `tickets` a propósito — no hay sorteo, horario ni cutoff: se juega
 * y se resuelve en el mismo request. La contrapartida es que estas jugadas
 * NO aparecen en los reportes de ventas existentes, que agregan sobre
 * `tickets`.
 */
export class AddRoulette1784200000000 implements MigrationInterface {
  name = 'AddRoulette1784200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "roulette_configs" (
        "id"               uuid PRIMARY KEY,
        "sale_point_id"    uuid NULL REFERENCES "sale_points"("id") ON DELETE CASCADE,
        "win_percent_bps"  integer NOT NULL,
        "prize_multiplier" integer NOT NULL,
        "created_at"       timestamptz NOT NULL DEFAULT now(),
        "updated_at"       timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_roulette_win_percent" CHECK ("win_percent_bps" BETWEEN 0 AND 10000),
        CONSTRAINT "CHK_roulette_multiplier"  CHECK ("prize_multiplier" >= 1)
      )
    `);

    // Una sola config por sucursal...
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_roulette_configs_sale_point"
        ON "roulette_configs" ("sale_point_id")
        WHERE "sale_point_id" IS NOT NULL
    `);
    // ...y una sola global. Hacen falta dos índices parciales porque
    // Postgres no considera iguales a dos NULL: un UNIQUE normal dejaría
    // crear infinitas filas globales y el fallback elegiría cualquiera.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_roulette_configs_global"
        ON "roulette_configs" (("sale_point_id" IS NULL))
        WHERE "sale_point_id" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "roulette_plays" (
        "id"                uuid PRIMARY KEY,
        "sale_point_id"     uuid NOT NULL REFERENCES "sale_points"("id") ON DELETE RESTRICT,
        "player_id"         uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "numbers"           text[] NOT NULL,
        "amount_per_number" integer NOT NULL,
        "total_amount"      integer NOT NULL,
        "winning_number"    varchar(2) NOT NULL,
        "is_win"            boolean NOT NULL,
        "prize"             integer NOT NULL DEFAULT 0,
        "win_percent_bps"   integer NOT NULL,
        "prize_multiplier"  integer NOT NULL,
        "created_at"        timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_roulette_plays_numbers" CHECK (cardinality("numbers") BETWEEN 1 AND 37),
        CONSTRAINT "CHK_roulette_plays_amount"  CHECK ("amount_per_number" >= 1)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_roulette_plays_sale_point_created" ON "roulette_plays" ("sale_point_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_roulette_plays_player" ON "roulette_plays" ("player_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_roulette_plays_created" ON "roulette_plays" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "roulette_plays"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roulette_configs"`);
  }
}
