import { MigrationInterface, QueryRunner } from "typeorm";

export class AdjustCutoffDefaults1783790714882 implements MigrationInterface {
    name = 'AdjustCutoffDefaults1783790714882'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tickets" ADD "cutoff_minutes" integer NOT NULL DEFAULT '2'`);
        await queryRunner.query(`ALTER TABLE "draw_schedules" ALTER COLUMN "cutoff_minutes" SET DEFAULT '2'`);
        await queryRunner.query(`UPDATE "draw_schedules" SET "cutoff_minutes" = 2 WHERE "cutoff_minutes" = 10`);
        await queryRunner.query(`UPDATE "draw_schedules" SET "cutoff_minutes" = 10 WHERE "game_id" IN (SELECT "id" FROM "games" WHERE "slug" = 'tica')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "draw_schedules" ALTER COLUMN "cutoff_minutes" SET DEFAULT '10'`);
        await queryRunner.query(`UPDATE "draw_schedules" SET "cutoff_minutes" = 10 WHERE "cutoff_minutes" = 2`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "cutoff_minutes"`);
    }

}
