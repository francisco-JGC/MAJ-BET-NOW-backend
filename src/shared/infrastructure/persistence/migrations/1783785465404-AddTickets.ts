import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTickets1783785465404 implements MigrationInterface {
    name = 'AddTickets1783785465404'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ticket_lines" ("id" uuid NOT NULL, "ticket_id" uuid NOT NULL, "label" character varying(40) NOT NULL, "amount" integer NOT NULL, "prize" integer NOT NULL, "sub_game_id" character varying(40), "sub_game_name" character varying(120), "order_index" integer NOT NULL, CONSTRAINT "PK_5ce19d434326593e14cc3d63e25" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tickets" ("id" uuid NOT NULL, "folio" character varying(20) NOT NULL, "game_id" uuid NOT NULL, "sale_point_id" uuid NOT NULL, "seller_id" uuid NOT NULL, "client" character varying(120), "status" character varying(20) NOT NULL, "voided_at" TIMESTAMP WITH TIME ZONE, "voided_reason" character varying(255), "total" integer NOT NULL DEFAULT '0', "total_prize" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a7ecdf58d46238138f1f4b0b43" ON "tickets"  ("folio") `);
        await queryRunner.query(`CREATE INDEX "IDX_82063440ed888f6469cb53c5d5" ON "tickets"  ("game_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_fd6dfdc271c1d5328341c14e62" ON "tickets"  ("sale_point_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2219067e8f4914e288cf9edcc2" ON "tickets"  ("seller_id") `);
        await queryRunner.query(`ALTER TABLE "ticket_lines" ADD CONSTRAINT "FK_8931f74c6f72256a142ef5a0d67" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_82063440ed888f6469cb53c5d52" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_fd6dfdc271c1d5328341c14e626" FOREIGN KEY ("sale_point_id") REFERENCES "sale_points"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_2219067e8f4914e288cf9edcc2d" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_2219067e8f4914e288cf9edcc2d"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_fd6dfdc271c1d5328341c14e626"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_82063440ed888f6469cb53c5d52"`);
        await queryRunner.query(`ALTER TABLE "ticket_lines" DROP CONSTRAINT "FK_8931f74c6f72256a142ef5a0d67"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2219067e8f4914e288cf9edcc2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fd6dfdc271c1d5328341c14e62"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_82063440ed888f6469cb53c5d5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a7ecdf58d46238138f1f4b0b43"`);
        await queryRunner.query(`DROP TABLE "tickets"`);
        await queryRunner.query(`DROP TABLE "ticket_lines"`);
    }

}
