import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableJ3HondurasPairPrize1784130000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE games
        SET pair_easy_multiplier = 200
        WHERE slug = 'j3honduras'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE games
        SET pair_easy_multiplier = NULL
        WHERE slug = 'j3honduras'
    `);
  }
}
