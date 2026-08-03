import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMaintenances1785400000000 implements MigrationInterface {
  name = 'AddMaintenances1785400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."maintenances_maintenance_type_enum" AS ENUM('OIL_CHANGE', 'FILTER_CHANGE', 'BRAKES', 'SUSPENSION', 'ALIGNMENT', 'BALANCING', 'TIRE_CHANGE', 'PREVENTIVE', 'CORRECTIVE', 'ENGINE', 'ELECTRICAL_SYSTEM', 'AIR_CONDITIONING', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "maintenances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "company_id" uuid NOT NULL, "vehicle_id" uuid NOT NULL, "date" date NOT NULL, "maintenance_type" "public"."maintenances_maintenance_type_enum" NOT NULL, "workshop" character varying(150), "mileage" integer NOT NULL, "description" text, "labor_cost" numeric(10,2) NOT NULL DEFAULT 0, "parts_cost" numeric(10,2) NOT NULL DEFAULT 0, "total_cost" numeric(10,2) NOT NULL, "next_maintenance_date" date, "next_maintenance_mileage" integer, CONSTRAINT "PK_maintenances_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_maintenances_company_date" ON "maintenances" ("company_id", "date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_maintenances_vehicle_date" ON "maintenances" ("vehicle_id", "date")`,
    );
    await queryRunner.query(
      `ALTER TABLE "maintenances" ADD CONSTRAINT "FK_maintenances_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "maintenances" ADD CONSTRAINT "FK_maintenances_vehicle" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "maintenances" DROP CONSTRAINT "FK_maintenances_vehicle"`,
    );
    await queryRunner.query(
      `ALTER TABLE "maintenances" DROP CONSTRAINT "FK_maintenances_company"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_maintenances_vehicle_date"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_maintenances_company_date"`,
    );
    await queryRunner.query(`DROP TABLE "maintenances"`);
    await queryRunner.query(
      `DROP TYPE "public"."maintenances_maintenance_type_enum"`,
    );
  }
}
