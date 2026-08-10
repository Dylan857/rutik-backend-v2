import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1783092695776 implements MigrationInterface {
  name = 'InitialSchema1783092695776';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."companies_status_enum" AS ENUM('active', 'inactive', 'suspended')`,
    );
    await queryRunner.query(
      `CREATE TABLE "companies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(255) NOT NULL, "nit" character varying(50) NOT NULL, "email" character varying(255) NOT NULL, "phone" character varying(20), "address" character varying(500), "latitude" double precision, "longitude" double precision, "status" "public"."companies_status_enum" NOT NULL DEFAULT 'active', "timezone" character varying(100) NOT NULL DEFAULT 'UTC', CONSTRAINT "UQ_ed61d4dcafb6fe0f595f5e0cbd0" UNIQUE ("nit"), CONSTRAINT "UQ_d0af6f5866201d5cb424767744a" UNIQUE ("email"), CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('super_admin', 'admin', 'driver', 'guardian')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "company_id" uuid, "role" "public"."users_role_enum" NOT NULL, "first_name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "document" character varying(50) NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "phone" character varying(20), "status" "public"."users_status_enum" NOT NULL DEFAULT 'active', "last_login_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_c1b20b2a1883ed106c3e746c25a" UNIQUE ("document"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."guardians_status_enum" AS ENUM('active', 'inactive')`,
    );
    await queryRunner.query(
      `CREATE TABLE "guardians" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "company_id" uuid NOT NULL, "user_id" uuid, "first_name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "document" character varying(50) NOT NULL, "phone" character varying(20) NOT NULL, "email" character varying(255) NOT NULL, "address" character varying(500), "status" "public"."guardians_status_enum" NOT NULL DEFAULT 'active', "observations" text, CONSTRAINT "REL_f1d05a3a2d70db0a25479b6718" UNIQUE ("user_id"), CONSTRAINT "PK_3dcf02f3dc96a2c017106f280be" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."drivers_payment_type_enum" AS ENUM('MONTHLY', 'WEEKLY', 'BIWEEKLY', 'PER_ROUTE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."drivers_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "drivers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "company_id" uuid NOT NULL, "user_id" uuid NOT NULL, "license_number" character varying(50) NOT NULL, "license_category" character varying(20) NOT NULL, "license_expiration_date" date NOT NULL, "hire_date" date NOT NULL, "salary" numeric(10,2) NOT NULL, "payment_type" "public"."drivers_payment_type_enum" NOT NULL, "status" "public"."drivers_status_enum" NOT NULL DEFAULT 'ACTIVE', "observations" text, CONSTRAINT "UQ_8e224f1b8f05ace7cfc7c76d03b" UNIQUE ("user_id"), CONSTRAINT "REL_8e224f1b8f05ace7cfc7c76d03" UNIQUE ("user_id"), CONSTRAINT "PK_92ab3fb69e566d3eb0cae896047" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."schools_status_enum" AS ENUM('active', 'inactive')`,
    );
    await queryRunner.query(
      `CREATE TABLE "schools" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "company_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "address" character varying(500), "latitude" double precision, "longitude" double precision, "phone" character varying(20), "email" character varying(255), "status" "public"."schools_status_enum" NOT NULL DEFAULT 'active', CONSTRAINT "PK_95b932e47ac129dd8e23a0db548" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."school_schedules_status_enum" AS ENUM('active', 'inactive')`,
    );
    await queryRunner.query(
      `CREATE TABLE "school_schedules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "company_id" uuid NOT NULL, "school_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "status" "public"."school_schedules_status_enum" NOT NULL DEFAULT 'active', CONSTRAINT "PK_068dbfe2671508e8051df86eaa3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."vehicles_vehicle_type_enum" AS ENUM('CAR', 'VAN', 'MINIBUS', 'BUS')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."vehicles_status_enum" AS ENUM('ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'INACTIVE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "vehicles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "company_id" uuid NOT NULL, "plate" character varying(20) NOT NULL, "brand" character varying(100) NOT NULL, "model" character varying(100) NOT NULL, "year" smallint NOT NULL, "color" character varying(50) NOT NULL, "vehicle_type" "public"."vehicles_vehicle_type_enum" NOT NULL, "capacity" smallint NOT NULL, "soat_number" character varying(50) NOT NULL, "soat_expiration_date" date NOT NULL, "technical_inspection_number" character varying(50) NOT NULL, "technical_inspection_expiration_date" date NOT NULL, "current_mileage" integer NOT NULL DEFAULT '0', "status" "public"."vehicles_status_enum" NOT NULL DEFAULT 'ACTIVE', "observations" text, CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."school_assignments_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "school_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "company_id" uuid NOT NULL, "school_id" uuid NOT NULL, "schedule_id" uuid NOT NULL, "driver_id" uuid NOT NULL, "vehicle_id" uuid NOT NULL, "status" "public"."school_assignments_status_enum" NOT NULL DEFAULT 'ACTIVE', CONSTRAINT "PK_e7885fe59aa800f53f2221dbe6f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."school_routes_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "school_routes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "company_id" uuid NOT NULL, "school_assignment_id" uuid NOT NULL, "status" "public"."school_routes_status_enum" NOT NULL DEFAULT 'ACTIVE', CONSTRAINT "UQ_0f9356633c9a09f9f6680788b39" UNIQUE ("school_assignment_id"), CONSTRAINT "REL_0f9356633c9a09f9f6680788b3" UNIQUE ("school_assignment_id"), CONSTRAINT "PK_e87f27824f7eff04f5674a57d5b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."students_status_enum" AS ENUM('active', 'inactive')`,
    );
    await queryRunner.query(
      `CREATE TABLE "students" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "company_id" uuid NOT NULL, "school_id" uuid NOT NULL, "schedule_id" uuid NOT NULL, "first_name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "document" character varying(50), "birth_date" date, "grade" character varying(50) NOT NULL, "address" character varying(500) NOT NULL, "latitude" double precision NOT NULL, "longitude" double precision NOT NULL, "start_date" date NOT NULL, "monthly_fee" numeric(10,2) NOT NULL DEFAULT '0', "payment_due_day" smallint NOT NULL DEFAULT '5', "transport_start_date" date, "transport_end_date" date, "status" "public"."students_status_enum" NOT NULL DEFAULT 'active', "observations" text, CONSTRAINT "PK_7d7f07271ad4ce999880713f05e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "route_stops" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "school_route_id" uuid NOT NULL, "student_id" uuid NOT NULL, "stop_order" integer NOT NULL, "latitude_snapshot" double precision NOT NULL, "longitude_snapshot" double precision NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_22c09afc24c0a7a13644c629073" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."student_guardians_relationship_type_enum" AS ENUM('MOTHER', 'FATHER', 'GRANDMOTHER', 'GRANDFATHER', 'UNCLE', 'AUNT', 'LEGAL_GUARDIAN', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "student_guardians" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "student_id" uuid NOT NULL, "guardian_id" uuid NOT NULL, "relationship_type" "public"."student_guardians_relationship_type_enum" NOT NULL, "is_primary" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_11ef78f5131711d8da1b14e3332" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."student_payments_status_enum" AS ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."student_payments_payment_method_enum" AS ENUM('CASH', 'TRANSFER', 'NEQUI', 'DAVIPLATA', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "student_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "company_id" uuid NOT NULL, "student_id" uuid NOT NULL, "billing_month" smallint NOT NULL, "billing_year" smallint NOT NULL, "monthly_fee" numeric(10,2) NOT NULL, "amount_paid" numeric(10,2) NOT NULL DEFAULT '0', "status" "public"."student_payments_status_enum" NOT NULL DEFAULT 'PENDING', "due_date" date, "paid_at" TIMESTAMP WITH TIME ZONE, "payment_method" "public"."student_payments_payment_method_enum", "notes" text, CONSTRAINT "PK_e7505845c50977798312c4af0aa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_7ae6334059289559722437bcc1c" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "guardians" ADD CONSTRAINT "FK_2f2efae2168b0b6da9c8f9ba5e6" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "guardians" ADD CONSTRAINT "FK_f1d05a3a2d70db0a25479b67189" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "drivers" ADD CONSTRAINT "FK_2ffd7a9646568f60a28f25c5912" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "drivers" ADD CONSTRAINT "FK_8e224f1b8f05ace7cfc7c76d03b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "schools" ADD CONSTRAINT "FK_844defc08c3c85ff241e3277e14" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_schedules" ADD CONSTRAINT "FK_38f5a147f0290355bdb53446b59" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_schedules" ADD CONSTRAINT "FK_dd94d20675b1b7c5637196ebab7" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD CONSTRAINT "FK_e11ef2dcd880132d31bd9f92c2a" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_assignments" ADD CONSTRAINT "FK_9b4a11ab7ec81c0ac1da1783b86" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_assignments" ADD CONSTRAINT "FK_6a32c9026c9d092526394768041" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_assignments" ADD CONSTRAINT "FK_dd2191262d43ac26286e8ddaf8b" FOREIGN KEY ("schedule_id") REFERENCES "school_schedules"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_assignments" ADD CONSTRAINT "FK_3915673d095ad6e68f58b4330e6" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_assignments" ADD CONSTRAINT "FK_34a11b26db7c1ff0243528be13c" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_routes" ADD CONSTRAINT "FK_953208550013494858fa19aab58" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_routes" ADD CONSTRAINT "FK_0f9356633c9a09f9f6680788b39" FOREIGN KEY ("school_assignment_id") REFERENCES "school_assignments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD CONSTRAINT "FK_27e62bb071fdd6c06508bf36062" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD CONSTRAINT "FK_aa8edc7905ad764f85924569647" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD CONSTRAINT "FK_c55720ff925e4f981f48557d545" FOREIGN KEY ("schedule_id") REFERENCES "school_schedules"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_stops" ADD CONSTRAINT "FK_124b619f6f3054d204a0267a9b7" FOREIGN KEY ("school_route_id") REFERENCES "school_routes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_stops" ADD CONSTRAINT "FK_1607938363b9a1db60e391c9805" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_guardians" ADD CONSTRAINT "FK_8194052bdd62204f061dd44e0c9" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_guardians" ADD CONSTRAINT "FK_ec3cd56a2093be19f778af57c63" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_payments" ADD CONSTRAINT "FK_7c1401e8e8901de247f7b012bdd" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_payments" ADD CONSTRAINT "FK_cd2717d3f280d32022aaf7eb3be" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "student_payments" DROP CONSTRAINT "FK_cd2717d3f280d32022aaf7eb3be"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_payments" DROP CONSTRAINT "FK_7c1401e8e8901de247f7b012bdd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_guardians" DROP CONSTRAINT "FK_ec3cd56a2093be19f778af57c63"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_guardians" DROP CONSTRAINT "FK_8194052bdd62204f061dd44e0c9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_stops" DROP CONSTRAINT "FK_1607938363b9a1db60e391c9805"`,
    );
    await queryRunner.query(
      `ALTER TABLE "route_stops" DROP CONSTRAINT "FK_124b619f6f3054d204a0267a9b7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" DROP CONSTRAINT "FK_c55720ff925e4f981f48557d545"`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" DROP CONSTRAINT "FK_aa8edc7905ad764f85924569647"`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" DROP CONSTRAINT "FK_27e62bb071fdd6c06508bf36062"`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_routes" DROP CONSTRAINT "FK_0f9356633c9a09f9f6680788b39"`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_routes" DROP CONSTRAINT "FK_953208550013494858fa19aab58"`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_assignments" DROP CONSTRAINT "FK_34a11b26db7c1ff0243528be13c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_assignments" DROP CONSTRAINT "FK_3915673d095ad6e68f58b4330e6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_assignments" DROP CONSTRAINT "FK_dd2191262d43ac26286e8ddaf8b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_assignments" DROP CONSTRAINT "FK_6a32c9026c9d092526394768041"`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_assignments" DROP CONSTRAINT "FK_9b4a11ab7ec81c0ac1da1783b86"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT "FK_e11ef2dcd880132d31bd9f92c2a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_schedules" DROP CONSTRAINT "FK_dd94d20675b1b7c5637196ebab7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_schedules" DROP CONSTRAINT "FK_38f5a147f0290355bdb53446b59"`,
    );
    await queryRunner.query(
      `ALTER TABLE "schools" DROP CONSTRAINT "FK_844defc08c3c85ff241e3277e14"`,
    );
    await queryRunner.query(
      `ALTER TABLE "drivers" DROP CONSTRAINT "FK_8e224f1b8f05ace7cfc7c76d03b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "drivers" DROP CONSTRAINT "FK_2ffd7a9646568f60a28f25c5912"`,
    );
    await queryRunner.query(
      `ALTER TABLE "guardians" DROP CONSTRAINT "FK_f1d05a3a2d70db0a25479b67189"`,
    );
    await queryRunner.query(
      `ALTER TABLE "guardians" DROP CONSTRAINT "FK_2f2efae2168b0b6da9c8f9ba5e6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_7ae6334059289559722437bcc1c"`,
    );
    await queryRunner.query(`DROP TABLE "student_payments"`);
    await queryRunner.query(
      `DROP TYPE "public"."student_payments_payment_method_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."student_payments_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "student_guardians"`);
    await queryRunner.query(
      `DROP TYPE "public"."student_guardians_relationship_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "route_stops"`);
    await queryRunner.query(`DROP TABLE "students"`);
    await queryRunner.query(`DROP TYPE "public"."students_status_enum"`);
    await queryRunner.query(`DROP TABLE "school_routes"`);
    await queryRunner.query(`DROP TYPE "public"."school_routes_status_enum"`);
    await queryRunner.query(`DROP TABLE "school_assignments"`);
    await queryRunner.query(
      `DROP TYPE "public"."school_assignments_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "vehicles"`);
    await queryRunner.query(`DROP TYPE "public"."vehicles_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."vehicles_vehicle_type_enum"`);
    await queryRunner.query(`DROP TABLE "school_schedules"`);
    await queryRunner.query(
      `DROP TYPE "public"."school_schedules_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "schools"`);
    await queryRunner.query(`DROP TYPE "public"."schools_status_enum"`);
    await queryRunner.query(`DROP TABLE "drivers"`);
    await queryRunner.query(`DROP TYPE "public"."drivers_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."drivers_payment_type_enum"`);
    await queryRunner.query(`DROP TABLE "guardians"`);
    await queryRunner.query(`DROP TYPE "public"."guardians_status_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TABLE "companies"`);
    await queryRunner.query(`DROP TYPE "public"."companies_status_enum"`);
  }
}
