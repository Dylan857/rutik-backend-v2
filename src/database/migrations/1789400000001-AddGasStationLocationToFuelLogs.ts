import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGasStationLocationToFuelLogs1789400000001 implements MigrationInterface {
  name = 'AddGasStationLocationToFuelLogs1789400000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fuel_logs" ADD "gas_station_address" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "fuel_logs" ADD "gas_station_latitude" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "fuel_logs" ADD "gas_station_longitude" double precision`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fuel_logs" DROP COLUMN "gas_station_longitude"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fuel_logs" DROP COLUMN "gas_station_latitude"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fuel_logs" DROP COLUMN "gas_station_address"`,
    );
  }
}
