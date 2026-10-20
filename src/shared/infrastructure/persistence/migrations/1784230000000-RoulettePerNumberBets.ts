import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cada casilla pasa a llevar su propio monto.
 *
 * Antes la jugada tenía `numbers text[]` y un único `amount_per_number`
 * que aplicaba a toda la selección. Ahora se apuesta como en una mesa
 * real: fichas distintas en casillas distintas.
 *
 * Se usa un `jsonb` con `[{ number, amount }]` y no dos arrays paralelos
 * (`numbers[]` + `amounts[]`), que podrían desalinearse por un bug y
 * dejar un monto aplicado a la casilla equivocada — con plata de por
 * medio, ese error sería silencioso y caro.
 *
 * La conversión preserva las jugadas existentes: cada número hereda el
 * `amount_per_number` que tenía, que es exactamente lo que valía.
 */
export class RoulettePerNumberBets1784230000000 implements MigrationInterface {
  name = 'RoulettePerNumberBets1784230000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roulette_plays" ADD COLUMN "bets" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(`
      UPDATE "roulette_plays"
         SET "bets" = (
           SELECT COALESCE(
             jsonb_agg(jsonb_build_object('number', n, 'amount', "amount_per_number")),
             '[]'::jsonb
           )
             FROM unnest("numbers") AS n
         )
    `);
    await queryRunner.query(
      `ALTER TABLE "roulette_plays" ALTER COLUMN "bets" DROP DEFAULT`,
    );

    await queryRunner.query(
      `ALTER TABLE "roulette_plays" DROP CONSTRAINT IF EXISTS "CHK_roulette_plays_numbers"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roulette_plays" DROP CONSTRAINT IF EXISTS "CHK_roulette_plays_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roulette_plays" DROP COLUMN "numbers"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roulette_plays" DROP COLUMN "amount_per_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roulette_plays" ADD CONSTRAINT "CHK_roulette_plays_bets"
         CHECK (jsonb_array_length("bets") BETWEEN 1 AND 37)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roulette_plays" DROP CONSTRAINT IF EXISTS "CHK_roulette_plays_bets"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roulette_plays" ADD COLUMN "numbers" text[] NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "roulette_plays" ADD COLUMN "amount_per_number" integer NOT NULL DEFAULT 1`,
    );
    // Vuelta atrás con pérdida: el modelo viejo no puede representar
    // montos distintos por casilla, así que se conserva el mayor. Se
    // documenta en vez de fingir que es reversible sin costo.
    await queryRunner.query(`
      UPDATE "roulette_plays"
         SET "numbers" = ARRAY(SELECT jsonb_array_elements("bets") ->> 'number'),
             "amount_per_number" = GREATEST(
               1,
               COALESCE((SELECT MAX((b ->> 'amount')::int)
                           FROM jsonb_array_elements("bets") AS b), 1)
             )
    `);
    await queryRunner.query(
      `ALTER TABLE "roulette_plays" DROP COLUMN "bets"`,
    );
  }
}
