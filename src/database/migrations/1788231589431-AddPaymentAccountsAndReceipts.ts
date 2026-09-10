import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentAccountsAndReceipts1788231589431
  implements MigrationInterface
{
  name = 'AddPaymentAccountsAndReceipts1788231589431';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // student_payments_status_enum gains IN_REVIEW (guardian submitted a
    // receipt, admin hasn't approved/rejected it yet). Cannot run inside the
    // same transaction as a statement that uses the new value — this
    // migration only adds it, never uses it.
    await queryRunner.query(
      `ALTER TYPE "public"."student_payments_status_enum" ADD VALUE 'IN_REVIEW'`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."payment_accounts_type_enum" AS ENUM('NEQUI', 'DAVIPLATA', 'BANK_TRANSFER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payment_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "company_id" uuid NOT NULL, "type" "public"."payment_accounts_type_enum" NOT NULL, "bank_name" character varying(100), "account_holder" character varying(255) NOT NULL, "account_number" character varying(100) NOT NULL, "account_type_label" character varying(50), "active" boolean NOT NULL DEFAULT true, "display_order" smallint NOT NULL DEFAULT 0, CONSTRAINT "PK_payment_accounts_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_accounts" ADD CONSTRAINT "FK_payment_accounts_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "student_payments" ADD "receipt_url" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_payments" ADD "receipt_reference" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_payments" ADD "payment_account_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_payments" ADD "submitted_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_payments" ADD "reviewed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_payments" ADD "reviewed_by" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_payments" ADD "rejection_reason" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_payments" ADD CONSTRAINT "FK_student_payments_payment_account" FOREIGN KEY ("payment_account_id") REFERENCES "payment_accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "student_payments" DROP CONSTRAINT "FK_student_payments_payment_account"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_payments" DROP COLUMN "rejection_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_payments" DROP COLUMN "reviewed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_payments" DROP COLUMN "reviewed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_payments" DROP COLUMN "submitted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_payments" DROP COLUMN "payment_account_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_payments" DROP COLUMN "receipt_reference"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_payments" DROP COLUMN "receipt_url"`,
    );

    await queryRunner.query(
      `ALTER TABLE "payment_accounts" DROP CONSTRAINT "FK_payment_accounts_company"`,
    );
    await queryRunner.query(`DROP TABLE "payment_accounts"`);
    await queryRunner.query(`DROP TYPE "public"."payment_accounts_type_enum"`);

    // Postgres has no ALTER TYPE ... DROP VALUE — IN_REVIEW is left in
    // student_payments_status_enum. Harmless if unused after rollback.
  }
}
