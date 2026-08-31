import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1783752169426 implements MigrationInterface {
  name = 'InitialSchema1783752169426';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL, "username" character varying(60) NOT NULL, "hashed_password" character varying NOT NULL, "name" character varying(120) NOT NULL, "role" character varying(20) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fe0bb3f6520ee0469504521e71" ON "users"  ("username") `,
    );
    await queryRunner.query(
      `CREATE TABLE "sale_points" ("id" uuid NOT NULL, "name" character varying(120) NOT NULL, "code" character varying(30) NOT NULL, "owner_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fa49646e54d8a1d2f174e98e0ad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_4cc18073790535d087f796ae0e" ON "sale_points"  ("code") `,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_points" ADD CONSTRAINT "FK_ac9285c51fd0ef7fd019f7f7727" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sale_points" DROP CONSTRAINT "FK_ac9285c51fd0ef7fd019f7f7727"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_4cc18073790535d087f796ae0e"`);
    await queryRunner.query(`DROP TABLE "sale_points"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fe0bb3f6520ee0469504521e71"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
