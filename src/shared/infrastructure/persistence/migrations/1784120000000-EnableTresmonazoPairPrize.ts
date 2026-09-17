import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableTresmonazoPairPrize1784120000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE games
        SET pair_easy_multiplier = 200
        WHERE slug = 'tresmonazo'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE games
        SET pair_easy_multiplier = NULL
        WHERE slug = 'tresmonazo'
    `);
  }
}
