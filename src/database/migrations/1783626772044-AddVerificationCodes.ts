import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVerificationCodes1783626772044 implements MigrationInterface {
  name = 'AddVerificationCodes1783626772044';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."verification_codes_purpose_enum" AS ENUM('PASSWORD_RESET')`,
    );
    await queryRunner.query(
      `CREATE TABLE "verification_codes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "code_hash" character varying(255) NOT NULL, "purpose" "public"."verification_codes_purpose_enum" NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "attempts" smallint NOT NULL DEFAULT 0, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1e1eb47f2c53c1cf1a8a0e4e4a4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "verification_codes" ADD CONSTRAINT "FK_9d6f915d3d33e4a5c5f8b0a1234" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "verification_codes" DROP CONSTRAINT "FK_9d6f915d3d33e4a5c5f8b0a1234"`,
    );
    await queryRunner.query(`DROP TABLE "verification_codes"`);
    await queryRunner.query(
      `DROP TYPE "public"."verification_codes_purpose_enum"`,
    );
  }
}
