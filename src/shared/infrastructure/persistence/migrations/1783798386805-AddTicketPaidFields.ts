import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTicketPaidFields1783798386805 implements MigrationInterface {
    name = 'AddTicketPaidFields1783798386805'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tickets" ADD "paid_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "paid_by_id" uuid`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "paid_prize" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "paid_prize"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "paid_by_id"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "paid_at"`);
    }

}
