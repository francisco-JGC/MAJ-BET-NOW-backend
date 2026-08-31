import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDrawSchedules1783789441055 implements MigrationInterface {
    name = 'AddDrawSchedules1783789441055'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "draw_schedules" ("id" uuid NOT NULL, "game_id" uuid NOT NULL, "day_of_week" smallint, "draw_time" character varying(5) NOT NULL, "cutoff_minutes" integer NOT NULL DEFAULT '10', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5f2965b05066e0a307a7a2f503f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_db9c1d1a5e22e89f23b8f4e857" ON "draw_schedules"  ("game_id") `);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "draw_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`UPDATE "tickets" SET "draw_at" = "created_at" WHERE "draw_at" IS NULL`);
        await queryRunner.query(`ALTER TABLE "tickets" ALTER COLUMN "draw_at" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_c37e75cde578a5282e25caa298" ON "tickets"  ("draw_at") `);
        await queryRunner.query(`ALTER TABLE "draw_schedules" ADD CONSTRAINT "FK_db9c1d1a5e22e89f23b8f4e857d" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "draw_schedules" DROP CONSTRAINT "FK_db9c1d1a5e22e89f23b8f4e857d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c37e75cde578a5282e25caa298"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "draw_at"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_db9c1d1a5e22e89f23b8f4e857"`);
        await queryRunner.query(`DROP TABLE "draw_schedules"`);
    }

}
