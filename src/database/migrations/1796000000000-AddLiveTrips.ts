import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLiveTrips1796000000000 implements MigrationInterface {
  name = 'AddLiveTrips1796000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."route_trips_leg_enum" AS ENUM('PICKUP', 'DROPOFF')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."route_trips_status_enum" AS ENUM('IN_PROGRESS', 'COMPLETED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "route_trips" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "company_id" uuid NOT NULL, "school_route_id" uuid NOT NULL, "driver_id" uuid NOT NULL, "vehicle_id" uuid, "date" date NOT NULL, "leg" "public"."route_trips_leg_enum" NOT NULL, "status" "public"."route_trips_status_enum" NOT NULL DEFAULT 'IN_PROGRESS', "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ended_at" TIMESTAMP WITH TIME ZONE, "school_name" character varying(150) NOT NULL, "driver_name" character varying(150) NOT NULL, "vehicle_plate" character varying(20), "polyline" text, "destination_lat" double precision, "destination_lng" double precision, "last_lat" double precision, "last_lng" double precision, "last_heading" double precision, "last_speed" double precision, "last_location_at" TIMESTAMP WITH TIME ZONE, "last_trail_at" TIMESTAMP WITH TIME ZONE, "eta_destination_seconds" integer, "eta_updated_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_035c07443eeca0b3620885c1eea" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9b4e6fff2aa07e0beafe21556b" ON "route_trips" ("company_id", "status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_route_trips_active_route_leg" ON "route_trips" ("school_route_id", "date", "leg") WHERE "status" = 'IN_PROGRESS'`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."trip_stops_status_enum" AS ENUM('PENDING', 'APPROACHING', 'ARRIVED', 'DONE', 'NOT_DONE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "trip_stops" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "trip_id" uuid NOT NULL, "route_stop_id" uuid NOT NULL, "student_id" uuid NOT NULL, "student_name" character varying(200) NOT NULL, "sequence" integer NOT NULL, "latitude" double precision NOT NULL, "longitude" double precision NOT NULL, "status" "public"."trip_stops_status_enum" NOT NULL DEFAULT 'PENDING', "eta_seconds" integer, "approaching_notified_at" TIMESTAMP WITH TIME ZONE, "arrived_at" TIMESTAMP WITH TIME ZONE, "resolved_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_876633f878970267cb0dc525984" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_42bce8bae8e69fc59dc0851ed3" ON "trip_stops" ("trip_id", "sequence") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_56d25f3d7b41fed907ce29ce30" ON "trip_stops" ("student_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_stops" ADD CONSTRAINT "FK_5cb5ec6432abdf6f1e1c3a0970c" FOREIGN KEY ("trip_id") REFERENCES "route_trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "trip_locations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "trip_id" uuid NOT NULL, "latitude" double precision NOT NULL, "longitude" double precision NOT NULL, "speed" double precision, "heading" double precision, "recorded_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f053370498ff61658917241d211" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1f583fee0a8f12a1b439673046" ON "trip_locations" ("trip_id", "recorded_at") `,
    );

    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'ROUTE_STARTED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'ROUTE_FINISHED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'STUDENT_NOT_PICKED_UP'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_source_type_enum" ADD VALUE IF NOT EXISTS 'TRIP'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres can't drop enum values; the extra notification types stay.
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1f583fee0a8f12a1b439673046"`,
    );
    await queryRunner.query(`DROP TABLE "trip_locations"`);
    await queryRunner.query(
      `ALTER TABLE "trip_stops" DROP CONSTRAINT "FK_5cb5ec6432abdf6f1e1c3a0970c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_56d25f3d7b41fed907ce29ce30"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_42bce8bae8e69fc59dc0851ed3"`,
    );
    await queryRunner.query(`DROP TABLE "trip_stops"`);
    await queryRunner.query(`DROP TYPE "public"."trip_stops_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_route_trips_active_route_leg"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9b4e6fff2aa07e0beafe21556b"`,
    );
    await queryRunner.query(`DROP TABLE "route_trips"`);
    await queryRunner.query(`DROP TYPE "public"."route_trips_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."route_trips_leg_enum"`);
  }
}
