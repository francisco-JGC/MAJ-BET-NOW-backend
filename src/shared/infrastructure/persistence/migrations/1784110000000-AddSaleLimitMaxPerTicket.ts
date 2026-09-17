import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSaleLimitMaxPerTicket1784110000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_limits
        ADD COLUMN max_per_ticket INTEGER NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sale_limits
        DROP COLUMN max_per_ticket
    `);
  }
}
