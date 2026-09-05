import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSaleLimitByNumberMinAmount1784100000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_limits_by_number
        ADD COLUMN min_amount INTEGER NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_limits_by_number
        DROP COLUMN min_amount
    `);
  }
}
