import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGuardianChatAbsences1795487105995 implements MigrationInterface {
  name = 'AddGuardianChatAbsences1795487105995';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."guardian_messages_category_enum" AS ENUM('CONCERN', 'COMPLAINT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."guardian_messages_topic_enum" AS ENUM('PUNCTUALITY', 'DRIVER', 'VEHICLE', 'ROUTE', 'PAYMENTS', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."guardian_messages_status_enum" AS ENUM('OPEN', 'RESOLVED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "guardian_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "company_id" uuid NOT NULL, "guardian_user_id" uuid NOT NULL, "student_id" uuid, "category" "public"."guardian_messages_category_enum" NOT NULL, "topic" "public"."guardian_messages_topic_enum" NOT NULL, "message" text NOT NULL, "status" "public"."guardian_messages_status_enum" NOT NULL DEFAULT 'OPEN', "resolved_at" TIMESTAMP WITH TIME ZONE, "resolved_by_user_id" uuid, CONSTRAINT "PK_aa37535d3cb12ee066309ebb65a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "daily_route_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "school_route_id" uuid NOT NULL, "date" date NOT NULL, "pickup_stop_ids" jsonb NOT NULL, "dropoff_stop_ids" jsonb NOT NULL, "polyline" text, "distance_meters" integer, "duration_seconds" integer, "polyline_return" text, "distance_meters_return" integer, "duration_seconds_return" integer, "computed_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_daily_route_plans_route_date" UNIQUE ("school_route_id", "date"), CONSTRAINT "PK_5dd53c90beee0d6f1fcff67be23" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."student_absences_leg_enum" AS ENUM('PICKUP', 'DROPOFF', 'BOTH')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."student_absences_status_enum" AS ENUM('ACTIVE', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "student_absences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "company_id" uuid NOT NULL, "student_id" uuid NOT NULL, "date" date NOT NULL, "leg" "public"."student_absences_leg_enum" NOT NULL, "reason" text, "reported_by_user_id" uuid NOT NULL, "status" "public"."student_absences_status_enum" NOT NULL DEFAULT 'ACTIVE', "cancelled_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_4248ca4757af0ed5338cc69607b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_student_absences_active_student_date" ON "student_absences"  ("student_id", "date") WHERE "status" = 'ACTIVE' AND "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'STUDENT_ABSENCE_REPORTED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'GUARDIAN_MESSAGE_RECEIVED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_source_type_enum" ADD VALUE IF NOT EXISTS 'STUDENT'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_source_type_enum" ADD VALUE IF NOT EXISTS 'GUARDIAN_MESSAGE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "guardian_messages" ADD CONSTRAINT "FK_233e7d8e2c2a4213b01efd1ba7b" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "guardian_messages" ADD CONSTRAINT "FK_f4bfe6f3c7dace64b16ebeaa6d1" FOREIGN KEY ("guardian_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "guardian_messages" ADD CONSTRAINT "FK_27d58c499e8536992f80f5a5a8a" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_route_plans" ADD CONSTRAINT "FK_7b71287785cbac516c8d0fcc074" FOREIGN KEY ("school_route_id") REFERENCES "school_routes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_absences" ADD CONSTRAINT "FK_2daa28b7be6564c43c68c0014f4" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_absences" ADD CONSTRAINT "FK_d03fa432411ca68e80f85ccf4e9" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_absences" ADD CONSTRAINT "FK_2482bb697fc1e8bc1c0b9f20d84" FOREIGN KEY ("reported_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "student_absences" DROP CONSTRAINT "FK_2482bb697fc1e8bc1c0b9f20d84"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_absences" DROP CONSTRAINT "FK_d03fa432411ca68e80f85ccf4e9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_absences" DROP CONSTRAINT "FK_2daa28b7be6564c43c68c0014f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_route_plans" DROP CONSTRAINT "FK_7b71287785cbac516c8d0fcc074"`,
    );
    await queryRunner.query(
      `ALTER TABLE "guardian_messages" DROP CONSTRAINT "FK_27d58c499e8536992f80f5a5a8a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "guardian_messages" DROP CONSTRAINT "FK_f4bfe6f3c7dace64b16ebeaa6d1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "guardian_messages" DROP CONSTRAINT "FK_233e7d8e2c2a4213b01efd1ba7b"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_source_type_enum_old" AS ENUM('VEHICLE', 'BILLING_CYCLE', 'MAINTENANCE', 'STUDENT_PAYMENT', 'DRIVER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "source_type" TYPE "public"."notifications_source_type_enum_old" USING "source_type"::"text"::"public"."notifications_source_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."notifications_source_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_source_type_enum_old" RENAME TO "notifications_source_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('VEHICLE_DOCUMENT_EXPIRING', 'BILLING_CYCLE_READY', 'MAINTENANCE_DUE', 'PAYMENT_RECEIPT_SUBMITTED', 'DRIVER_LICENSE_EXPIRING')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_student_absences_active_student_date"`,
    );
    await queryRunner.query(`DROP TABLE "student_absences"`);
    await queryRunner.query(
      `DROP TYPE "public"."student_absences_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."student_absences_leg_enum"`);
    await queryRunner.query(`DROP TABLE "daily_route_plans"`);
    await queryRunner.query(`DROP TABLE "guardian_messages"`);
    await queryRunner.query(
      `DROP TYPE "public"."guardian_messages_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."guardian_messages_topic_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."guardian_messages_category_enum"`,
    );
  }
}
