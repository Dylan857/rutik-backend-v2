import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBillingCycleReadyNotificationType1785337294005
  implements MigrationInterface
{
  name = 'AddBillingCycleReadyNotificationType1785337294005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'BILLING_CYCLE_READY'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres has no DROP VALUE for enums; removing it would require
    // recreating the type and rewriting every dependent column, which is
    // out of scope for a revert here.
  }
}
