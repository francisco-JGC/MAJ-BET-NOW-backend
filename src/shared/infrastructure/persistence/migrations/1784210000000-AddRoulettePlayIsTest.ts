import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marca de "jugada de prueba" en la ruleta.
 *
 * Las pruebas se guardan igual que una jugada real, pero marcadas: el
 * historial y los totales las excluyen por defecto. Se persisten en vez de
 * descartarse para que una racha llamativa pueda auditarse y para poder
 * distinguir "nadie jugó" de "se estuvo probando".
 *
 * `DEFAULT false` deja a todas las jugadas ya existentes como reales, que
 * es lo correcto: se hicieron antes de que existiera el modo prueba.
 */
export class AddRoulettePlayIsTest1784210000000 implements MigrationInterface {
  name = 'AddRoulettePlayIsTest1784210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roulette_plays" ADD COLUMN "is_test" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_roulette_plays_is_test" ON "roulette_plays" ("is_test")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_roulette_plays_is_test"`);
    await queryRunner.query(`ALTER TABLE "roulette_plays" DROP COLUMN "is_test"`);
  }
}
