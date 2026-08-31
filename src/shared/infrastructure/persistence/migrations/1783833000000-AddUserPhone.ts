import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Every user gets a contact phone. Nullable so historical rows keep working;
 * the UI enforces it on new creations.
 */
export class AddUserPhone1783833000000 implements MigrationInterface {
  name = 'AddUserPhone1783833000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "phone" character varying(20)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone"`);
  }
}
