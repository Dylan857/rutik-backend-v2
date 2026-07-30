import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBimonthlyInspectionToVehicles1785370487223 implements MigrationInterface {
  name = 'AddBimonthlyInspectionToVehicles1785370487223';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD "is_public_service" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD "last_bimonthly_inspection_date" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD "bimonthly_inspection_expiration_date" date`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP COLUMN "bimonthly_inspection_expiration_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP COLUMN "last_bimonthly_inspection_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP COLUMN "is_public_service"`,
    );
  }
}
