import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDirectionsCacheToSchoolRoutes1783346294107 implements MigrationInterface {
  name = 'AddDirectionsCacheToSchoolRoutes1783346294107';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "school_routes" ADD "polyline" text`);
    await queryRunner.query(
      `ALTER TABLE "school_routes" ADD "distance_meters" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_routes" ADD "duration_seconds" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_routes" ADD "directions_updated_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "school_routes" DROP COLUMN "directions_updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_routes" DROP COLUMN "duration_seconds"`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_routes" DROP COLUMN "distance_meters"`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_routes" DROP COLUMN "polyline"`,
    );
  }
}
