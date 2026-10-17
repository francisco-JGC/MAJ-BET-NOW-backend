import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La ruleta entra a la contabilidad normal.
 *
 * Cada tirada real pasa a emitir un ticket sobre un juego `ruleta` y su
 * propio `draw_result` en el mismo instante. Con eso, facturas, cuenta del
 * vendedor, totales de sucursal y ganadores la toman sin cambiar ninguna
 * consulta de reportes.
 *
 * El juego NO lleva horarios: no hay sorteo programado, cada giro es su
 * propio sorteo. `ResolveNextDraw` nunca se invoca para este juego porque
 * la ruleta no pasa por `CreateTicket`.
 *
 * Además mueve el modo prueba a la configuración, para que se decida desde
 * la web y no desde el teléfono del vendedor.
 */
export class AddRouletteGameAndTestMode1784220000000
  implements MigrationInterface
{
  name = 'AddRouletteGameAndTestMode1784220000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      // Arranca habilitado: así la ruleta se puede probar apenas se
      // despliega, sin tener que entrar a la web a destrabarla.
      `ALTER TABLE "roulette_configs" ADD COLUMN "test_mode" boolean NOT NULL DEFAULT true`,
    );

    // Se ubica al final de la grilla. Igual que en el alta de Juga 4, el
    // INSERT solo corre si YA hay juegos: en una base nueva el seed es
    // quien los crea, y adelantarnos lo haría abortar por `count() > 0`.
    await queryRunner.query(`
      INSERT INTO "games"
        ("id", "slug", "name", "type", "exact_multiplier", "easy_multiplier",
         "pair_easy_multiplier", "image_path", "order_index", "is_active")
      SELECT gen_random_uuid(), 'ruleta', 'Ruleta', 'roulette', 35, NULL, NULL,
             'assets/images/games/ruleta.webp',
             COALESCE((SELECT MAX("order_index") FROM "games"), 0) + 1, true
       WHERE EXISTS (SELECT 1 FROM "games")
      ON CONFLICT ("slug") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Igual que con Juga 4: no se borra el juego si ya hay tiradas
    // registradas. `tickets` y `draw_results` tienen FK RESTRICT, y perder
    // facturas para revertir una migración no es aceptable.
    await queryRunner.query(`
      DELETE FROM "games"
       WHERE "slug" = 'ruleta'
         AND NOT EXISTS (SELECT 1 FROM "tickets" t WHERE t."game_id" = "games"."id")
         AND NOT EXISTS (SELECT 1 FROM "draw_results" r WHERE r."game_id" = "games"."id")
    `);
    await queryRunner.query(
      `ALTER TABLE "roulette_configs" DROP COLUMN "test_mode"`,
    );
  }
}
