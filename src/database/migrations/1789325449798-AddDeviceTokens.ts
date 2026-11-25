import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeviceTokens1789325449798 implements MigrationInterface {
  name = 'AddDeviceTokens1789325449798';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."device_tokens_platform_enum" AS ENUM('android')`);
    await queryRunner.query(
      `CREATE TABLE "device_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid NOT NULL, "token" character varying(500) NOT NULL, "platform" "public"."device_tokens_platform_enum" NOT NULL, "last_used_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "UQ_device_tokens_token" UNIQUE ("token"), CONSTRAINT "PK_device_tokens_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_device_tokens_user_id" ON "device_tokens" ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_tokens" ADD CONSTRAINT "FK_device_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "device_tokens" DROP CONSTRAINT "FK_device_tokens_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_device_tokens_user_id"`);
    await queryRunner.query(`DROP TABLE "device_tokens"`);
    await queryRunner.query(`DROP TYPE "public"."device_tokens_platform_enum"`);
  }
}
