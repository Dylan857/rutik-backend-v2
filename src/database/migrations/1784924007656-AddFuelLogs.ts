import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFuelLogs1784924007656 implements MigrationInterface {
  name = 'AddFuelLogs1784924007656';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "fuel_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "company_id" uuid NOT NULL, "vehicle_id" uuid NOT NULL, "date" date NOT NULL, "amount_paid" numeric(10,2) NOT NULL, "gallons" numeric(10,3) NOT NULL, "odometer" integer, "gas_station" character varying(150), "notes" text, CONSTRAINT "PK_fuel_logs_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fuel_logs_company_date" ON "fuel_logs" ("company_id", "date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fuel_logs_vehicle_date" ON "fuel_logs" ("vehicle_id", "date")`,
    );
    await queryRunner.query(
      `ALTER TABLE "fuel_logs" ADD CONSTRAINT "FK_fuel_logs_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "fuel_logs" ADD CONSTRAINT "FK_fuel_logs_vehicle" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fuel_logs" DROP CONSTRAINT "FK_fuel_logs_vehicle"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fuel_logs" DROP CONSTRAINT "FK_fuel_logs_company"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_fuel_logs_vehicle_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fuel_logs_company_date"`);
    await queryRunner.query(`DROP TABLE "fuel_logs"`);
  }
}
