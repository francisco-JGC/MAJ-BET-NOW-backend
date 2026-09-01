import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Habilita que un admin también pueda vender desde la app móvil. Un
 * admin sin sucursal asignada históricamente no podía crear tickets:
 * `create-ticket.use-case` valida que `seller.salePointId === input.salePointId`,
 * y el admin siempre tiene `salePointId = null`. Estos dos campos
 * permiten al admin auto-configurar su "modo vendedor" desde el perfil
 * del web, sin tocar el flujo tradicional del rol seller.
 *
 *   - `mobile_sales_enabled` — flag que el admin activa cuando quiere
 *     poder vender. Cuando está en `false`, el backend lo trata como
 *     un admin normal (sin acceso al flujo de venta).
 *
 *   - `default_sale_point_id` — a qué sucursal se le imputan las
 *     ventas del admin. Nullable porque hasta que el admin no elige
 *     una, el flag debe quedar deshabilitado. ON DELETE SET NULL
 *     porque si borran la sucursal, no queremos romper la fila del
 *     admin — se limpia el default y el modo vendedor se apaga.
 *
 * Ambos son opcionales: nada de esto afecta a sellers ni a partners,
 * ni a admins que no activen el modo.
 */
export class AddUsersMobileSalesProfile1784080000000
  implements MigrationInterface
{
  name = 'AddUsersMobileSalesProfile1784080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "mobile_sales_enabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "default_sale_point_id" uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_default_sale_point_id" ` +
        `FOREIGN KEY ("default_sale_point_id") ` +
        `REFERENCES "sale_points"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_users_default_sale_point_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "default_sale_point_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "mobile_sales_enabled"`,
    );
  }
}
