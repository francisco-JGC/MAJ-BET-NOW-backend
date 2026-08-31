import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGames1783781587940 implements MigrationInterface {
    name = 'AddGames1783781587940'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "games" ("id" uuid NOT NULL, "slug" character varying(40) NOT NULL, "name" character varying(120) NOT NULL, "type" character varying(20) NOT NULL, "main_multiplier" integer, "secondary_multiplier" integer, "image_path" character varying(255), "order_index" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c9b16b62917b5595af982d66337" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_095bbaa4f028fa5a03e37f631d" ON "games"  ("slug") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_095bbaa4f028fa5a03e37f631d"`);
        await queryRunner.query(`DROP TABLE "games"`);
    }

}
