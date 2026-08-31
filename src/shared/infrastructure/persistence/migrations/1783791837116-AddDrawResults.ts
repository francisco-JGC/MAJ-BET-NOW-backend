import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDrawResults1783791837116 implements MigrationInterface {
    name = 'AddDrawResults1783791837116'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "draw_results" ("id" uuid NOT NULL, "game_id" uuid NOT NULL, "draw_at" TIMESTAMP WITH TIME ZONE NOT NULL, "winning_number" character varying(20) NOT NULL, "recorded_by_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ecdce5fda25ae41bc3aef31b32a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_643d6a7b9e6ccc0e05ace114bc" ON "draw_results"  ("draw_at") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f308cdc8fa5d79cd770f0250d8" ON "draw_results"  ("game_id", "draw_at") `);
        await queryRunner.query(`ALTER TABLE "draw_results" ADD CONSTRAINT "FK_ffcd36a74dd6000fc5812e95c6c" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "draw_results" DROP CONSTRAINT "FK_ffcd36a74dd6000fc5812e95c6c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f308cdc8fa5d79cd770f0250d8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_643d6a7b9e6ccc0e05ace114bc"`);
        await queryRunner.query(`DROP TABLE "draw_results"`);
    }

}
