import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLuckyDailies1783827827753 implements MigrationInterface {
    name = 'AddLuckyDailies1783827827753'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "lucky_dailies" ("id" uuid NOT NULL, "kind" character varying(20) NOT NULL, "for_date" date NOT NULL, "payload" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0dd220983d84249389bde542815" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_af4b59673197ebc2b9feefeaa3" ON "lucky_dailies"  ("for_date") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cf842667889b15599e22784c6a" ON "lucky_dailies"  ("kind", "for_date") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_cf842667889b15599e22784c6a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_af4b59673197ebc2b9feefeaa3"`);
        await queryRunner.query(`DROP TABLE "lucky_dailies"`);
    }

}
