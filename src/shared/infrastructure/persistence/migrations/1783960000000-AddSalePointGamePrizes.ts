import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSalePointGamePrizes1783960000000
  implements MigrationInterface
{
  name = 'AddSalePointGamePrizes1783960000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Overrides on top of `games.main_multiplier` / `games.secondary_multiplier`.
    // When a row is absent for a given (game, sucursal), clients fall back to
    // the game's default. Both multipliers are nullable so operators can
    // override just one side and inherit the other.
    await queryRunner.query(
      `CREATE TABLE "sale_point_game_prizes" (
        "id" uuid NOT NULL,
        "sale_point_id" uuid NOT NULL,
        "game_id" uuid NOT NULL,
        "main_multiplier" integer,
        "secondary_multiplier" integer,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sale_point_game_prizes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sale_point_game_prizes_sale_point_id"
          FOREIGN KEY ("sale_point_id") REFERENCES "sale_points"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sale_point_game_prizes_game_id"
          FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_sale_point_game_prizes_sale_point_game"
          UNIQUE ("sale_point_id", "game_id"),
        CONSTRAINT "CHK_sale_point_game_prizes_main_positive"
          CHECK ("main_multiplier" IS NULL OR "main_multiplier" >= 0),
        CONSTRAINT "CHK_sale_point_game_prizes_secondary_positive"
          CHECK ("secondary_multiplier" IS NULL OR "secondary_multiplier" >= 0)
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sale_point_game_prizes_sale_point_id" ON "sale_point_game_prizes" ("sale_point_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_sale_point_game_prizes_sale_point_id"`,
    );
    await queryRunner.query(`DROP TABLE "sale_point_game_prizes"`);
  }
}
