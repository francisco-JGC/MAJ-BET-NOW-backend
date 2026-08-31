import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMovements1783836000000 implements MigrationInterface {
  name = 'AddMovements1783836000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "movements" (
        "id" uuid NOT NULL,
        "sale_point_id" uuid NOT NULL,
        "type" varchar(20) NOT NULL,
        "amount" integer NOT NULL,
        "description" varchar(255) NOT NULL DEFAULT '',
        "occurred_at" timestamptz NOT NULL,
        "created_by_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_movements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_movements_sale_point_id"
          FOREIGN KEY ("sale_point_id") REFERENCES "sale_points"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_movements_created_by_id"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_movements_amount_positive" CHECK ("amount" >= 0)
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_movements_sale_point_id" ON "movements" ("sale_point_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_movements_occurred_at" ON "movements" ("occurred_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_movements_type" ON "movements" ("type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_movements_type"`);
    await queryRunner.query(`DROP INDEX "IDX_movements_occurred_at"`);
    await queryRunner.query(`DROP INDEX "IDX_movements_sale_point_id"`);
    await queryRunner.query(`DROP TABLE "movements"`);
  }
}
