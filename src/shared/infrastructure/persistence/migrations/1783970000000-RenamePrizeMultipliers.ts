import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rename `main_multiplier`/`secondary_multiplier` → `exact_multiplier`/
 * `easy_multiplier` on both `games` and `sale_point_game_prizes`. Aligns
 * schema with the domain terminology sellers actually use (exacto/fácil).
 * Zero data change — pure column rename.
 */
export class RenamePrizeMultipliers1783970000000
  implements MigrationInterface
{
  name = 'RenamePrizeMultipliers1783970000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "games" RENAME COLUMN "main_multiplier" TO "exact_multiplier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "games" RENAME COLUMN "secondary_multiplier" TO "easy_multiplier"`,
    );

    await queryRunner.query(
      `ALTER TABLE "sale_point_game_prizes" RENAME COLUMN "main_multiplier" TO "exact_multiplier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_point_game_prizes" RENAME COLUMN "secondary_multiplier" TO "easy_multiplier"`,
    );

    // Rename CHECK constraints to match the new column names.
    await queryRunner.query(
      `ALTER TABLE "sale_point_game_prizes" DROP CONSTRAINT "CHK_sale_point_game_prizes_main_positive"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_point_game_prizes" DROP CONSTRAINT "CHK_sale_point_game_prizes_secondary_positive"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_point_game_prizes" ADD CONSTRAINT "CHK_sale_point_game_prizes_exact_positive" ` +
        `CHECK ("exact_multiplier" IS NULL OR "exact_multiplier" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_point_game_prizes" ADD CONSTRAINT "CHK_sale_point_game_prizes_easy_positive" ` +
        `CHECK ("easy_multiplier" IS NULL OR "easy_multiplier" >= 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sale_point_game_prizes" DROP CONSTRAINT "CHK_sale_point_game_prizes_easy_positive"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_point_game_prizes" DROP CONSTRAINT "CHK_sale_point_game_prizes_exact_positive"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_point_game_prizes" ADD CONSTRAINT "CHK_sale_point_game_prizes_secondary_positive" ` +
        `CHECK ("easy_multiplier" IS NULL OR "easy_multiplier" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_point_game_prizes" ADD CONSTRAINT "CHK_sale_point_game_prizes_main_positive" ` +
        `CHECK ("exact_multiplier" IS NULL OR "exact_multiplier" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_point_game_prizes" RENAME COLUMN "easy_multiplier" TO "secondary_multiplier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_point_game_prizes" RENAME COLUMN "exact_multiplier" TO "main_multiplier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "games" RENAME COLUMN "easy_multiplier" TO "secondary_multiplier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "games" RENAME COLUMN "exact_multiplier" TO "main_multiplier"`,
    );
  }
}
