import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProfileFields1783831000000 implements MigrationInterface {
  name = 'AddUserProfileFields1783831000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "address" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "national_id" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "payment_percentage" integer`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "sale_point_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_sale_point" FOREIGN KEY ("sale_point_id") REFERENCES "sale_points"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_sale_point" ON "users" ("sale_point_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_users_sale_point"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_users_sale_point"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "sale_point_id"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "payment_percentage"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "national_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "address"`);
  }
}
