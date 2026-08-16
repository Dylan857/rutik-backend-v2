import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogs1786904923008 implements MigrationInterface {
  name = 'AddAuditLogs1786904923008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('CREATED', 'UPDATED', 'DELETED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_entity_type_enum" AS ENUM('STUDENT', 'STUDENT_PAYMENT', 'DRIVER', 'DRIVER_PAYMENT', 'VEHICLE', 'SCHOOL', 'SCHOOL_ROUTE', 'SCHOOL_ASSIGNMENT', 'SCHOOL_SCHEDULE', 'GUARDIAN', 'STUDENT_GUARDIAN', 'FUEL_LOG', 'MAINTENANCE', 'USER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "company_id" uuid, "actor_user_id" uuid, "actor_email" character varying(255), "action" "public"."audit_logs_action_enum" NOT NULL, "entity_type" "public"."audit_logs_entity_type_enum" NOT NULL, "entity_id" uuid, "description" text NOT NULL, CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_company_created" ON "audit_logs" ("company_id", "created_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_audit_logs_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_audit_logs_actor_user" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_actor_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_company"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_audit_logs_company_created"`,
    );
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TYPE "public"."audit_logs_entity_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
  }
}
