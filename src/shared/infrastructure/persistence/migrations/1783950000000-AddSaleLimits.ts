import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSaleLimits1783950000000 implements MigrationInterface {
  name = 'AddSaleLimits1783950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "sale_limits" (
        "id" uuid NOT NULL,
        "game_id" uuid NOT NULL,
        "sale_point_id" uuid NOT NULL,
        "amount" integer NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sale_limits" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sale_limits_game_id"
          FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sale_limits_sale_point_id"
          FOREIGN KEY ("sale_point_id") REFERENCES "sale_points"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_sale_limits_game_sale_point"
          UNIQUE ("game_id", "sale_point_id"),
        CONSTRAINT "CHK_sale_limits_amount_positive" CHECK ("amount" >= 0)
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sale_limits_sale_point_id" ON "sale_limits" ("sale_point_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_sale_limits_sale_point_id"`);
    await queryRunner.query(`DROP TABLE "sale_limits"`);
  }
}
