import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReturnDirectionsCacheToSchoolRoutes1783349988738 implements MigrationInterface {
  name = 'AddReturnDirectionsCacheToSchoolRoutes1783349988738';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "school_routes" ADD "polyline_return" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_routes" ADD "distance_meters_return" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_routes" ADD "duration_seconds_return" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "school_routes" DROP COLUMN "duration_seconds_return"`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_routes" DROP COLUMN "distance_meters_return"`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_routes" DROP COLUMN "polyline_return"`,
    );
  }
}
