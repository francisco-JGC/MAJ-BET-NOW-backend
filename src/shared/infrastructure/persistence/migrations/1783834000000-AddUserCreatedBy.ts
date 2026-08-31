import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserCreatedBy1783834000000 implements MigrationInterface {
  name = 'AddUserCreatedBy1783834000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "created_by_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_created_by_id" ` +
        `FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_created_by_id" ON "users" ("created_by_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_users_created_by_id"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_users_created_by_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "created_by_id"`,
    );
  }
}
