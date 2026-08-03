import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMaintenanceNotificationSourceType1785400000001 implements MigrationInterface {
  name = 'AddMaintenanceNotificationSourceType1785400000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_source_type_enum" ADD VALUE IF NOT EXISTS 'MAINTENANCE'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres has no DROP VALUE for enums; removing it would require
    // recreating the type and rewriting every dependent column, which is
    // out of scope for a revert here.
  }
}
