import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTicketsCreatedAtIndex1783835000000
  implements MigrationInterface
{
  name = 'AddTicketsCreatedAtIndex1783835000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // `created_at` is filtered on every /tickets, /tickets/summary and
    // /tickets/by-draw call (date range picker → BETWEEN). Other hot
    // filter columns (game_id, sale_point_id, seller_id, draw_at) are
    // already indexed by @Index() on the ORM entity.
    await queryRunner.query(
      `CREATE INDEX "IDX_tickets_created_at" ON "tickets" ("created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_tickets_created_at"`);
  }
}
