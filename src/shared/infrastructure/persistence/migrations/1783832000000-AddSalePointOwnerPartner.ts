import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Introduces the "partner" ownership model on sale_points.
 *
 * - `owner_partner_id` (nullable) → `users.id` of the socio that owns the
 *   sucursal. `NULL` means "owned by the main admin/owner" — those
 *   sucursales are only visible to admins.
 * - Drops the legacy `owner_id` column: it encoded a 1:1 "sucursal belongs
 *   to a single seller" relationship that we've already replaced by
 *   `users.sale_point_id` (multiple sellers per sucursal, since the
 *   `AddUserProfileFields` migration).
 */
export class AddSalePointOwnerPartner1783832000000
  implements MigrationInterface
{
  name = 'AddSalePointOwnerPartner1783832000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sale_points" ADD "owner_partner_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_points" ADD CONSTRAINT "FK_sale_points_owner_partner" FOREIGN KEY ("owner_partner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sale_points_owner_partner" ON "sale_points" ("owner_partner_id")`,
    );
    // Drop the legacy owner_id column — no longer used by ticket creation
    // or any live query path. Its FK/index (if any) go with it.
    await queryRunner.query(
      `ALTER TABLE "sale_points" DROP COLUMN "owner_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore owner_id as nullable so the down migration doesn't require
    // repopulating it from historical data.
    await queryRunner.query(
      `ALTER TABLE "sale_points" ADD "owner_id" uuid`,
    );
    await queryRunner.query(`DROP INDEX "IDX_sale_points_owner_partner"`);
    await queryRunner.query(
      `ALTER TABLE "sale_points" DROP CONSTRAINT "FK_sale_points_owner_partner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_points" DROP COLUMN "owner_partner_id"`,
    );
  }
}
