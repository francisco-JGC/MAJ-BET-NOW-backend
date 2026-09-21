import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableJ3HondurasPairPrize1784130000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE games
        SET pair_easy_multiplier = 200
        WHERE slug = 'gana3'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE games
        SET pair_easy_multiplier = NULL
        WHERE slug = 'gana3'
    `);
  }
}
