import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTripTypeAndSplitStopOrders1783373899288 implements MigrationInterface {
  name = 'AddTripTypeAndSplitStopOrders1783373899288';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."students_trip_type_enum" AS ENUM('ROUND_TRIP', 'PICKUP_ONLY', 'DROPOFF_ONLY')`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD "trip_type" "public"."students_trip_type_enum" NOT NULL DEFAULT 'ROUND_TRIP'`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_stops" ADD "stop_order_return" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_stops" ALTER COLUMN "stop_order" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "route_stops" ALTER COLUMN "stop_order" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_stops" DROP COLUMN "stop_order_return"`,
    );
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "trip_type"`);
    await queryRunner.query(`DROP TYPE "public"."students_trip_type_enum"`);
  }
}
