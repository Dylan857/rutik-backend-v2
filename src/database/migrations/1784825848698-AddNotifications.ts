import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotifications1784825848698 implements MigrationInterface {
  name = 'AddNotifications1784825848698';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('VEHICLE_DOCUMENT_EXPIRING')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_severity_enum" AS ENUM('INFO', 'WARNING', 'CRITICAL')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_source_type_enum" AS ENUM('VEHICLE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "company_id" uuid NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "severity" "public"."notifications_severity_enum" NOT NULL, "title" character varying(150) NOT NULL, "message" text NOT NULL, "source_type" "public"."notifications_source_type_enum", "source_id" uuid, "dedupe_key" character varying(255), "is_read" boolean NOT NULL DEFAULT false, "read_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_notifications_dedupe_key" UNIQUE ("dedupe_key"), CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_company_read" ON "notifications" ("company_id", "is_read")`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_company"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_notifications_company_read"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(
      `DROP TYPE "public"."notifications_source_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_severity_enum"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
  }
}
