import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDriverPayments1784049788512 implements MigrationInterface {
  name = 'AddDriverPayments1784049788512';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."driver_payments_status_enum" AS ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."driver_payments_payment_method_enum" AS ENUM('CASH', 'TRANSFER', 'NEQUI', 'DAVIPLATA', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "driver_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "company_id" uuid NOT NULL, "driver_id" uuid NOT NULL, "period_start" date NOT NULL, "period_end" date NOT NULL, "salary_amount" numeric(10,2) NOT NULL, "amount_paid" numeric(10,2) NOT NULL DEFAULT '0', "status" "public"."driver_payments_status_enum" NOT NULL DEFAULT 'PENDING', "due_date" date NOT NULL, "paid_at" TIMESTAMP WITH TIME ZONE, "payment_method" "public"."driver_payments_payment_method_enum", "notes" text, CONSTRAINT "PK_driver_payments_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_driver_payments_driver_period" ON "driver_payments" ("driver_id", "period_start", "period_end")`,
    );
    await queryRunner.query(
      `ALTER TABLE "driver_payments" ADD CONSTRAINT "FK_driver_payments_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "driver_payments" ADD CONSTRAINT "FK_driver_payments_driver" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "driver_payments" DROP CONSTRAINT "FK_driver_payments_driver"`,
    );
    await queryRunner.query(
      `ALTER TABLE "driver_payments" DROP CONSTRAINT "FK_driver_payments_company"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_driver_payments_driver_period"`,
    );
    await queryRunner.query(`DROP TABLE "driver_payments"`);
    await queryRunner.query(
      `DROP TYPE "public"."driver_payments_payment_method_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."driver_payments_status_enum"`);
  }
}
