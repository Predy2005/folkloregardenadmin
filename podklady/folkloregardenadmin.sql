-- Adminer 4.8.1 PostgreSQL 9.4.25 dump

DROP TABLE IF EXISTS "cash_movement";
DROP SEQUENCE IF EXISTS cash_movement_id_seq;
CREATE SEQUENCE cash_movement_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 37 CACHE 1;

CREATE TABLE "public"."cash_movement" (
    "id" integer DEFAULT nextval('cash_movement_id_seq') NOT NULL,
    "cashbox_id" integer NOT NULL,
    "reservation_id" integer,
    "user_id" integer,
    "movement_type" character varying(50) NOT NULL,
    "category" character varying(100),
    "amount" numeric(15,2) NOT NULL,
    "currency" character varying(3) DEFAULT 'CZK' NOT NULL,
    "description" text,
    "payment_method" character varying(50),
    "reference_id" character varying(100),
    "created_at" timestamp(0) NOT NULL,
    "staff_member_id" integer,
    "event_staff_assignment_id" integer,
    "updated_at" timestamp(0),
    CONSTRAINT "cash_movement_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_965e643a61110c8f" ON "public"."cash_movement" USING btree ("cashbox_id");

CREATE INDEX "idx_965e643aa76ed395" ON "public"."cash_movement" USING btree ("user_id");

CREATE INDEX "idx_965e643ab83297e7" ON "public"."cash_movement" USING btree ("reservation_id");


DROP TABLE IF EXISTS "cash_movement_category";
DROP SEQUENCE IF EXISTS cash_movement_category_id_seq;
CREATE SEQUENCE cash_movement_category_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 30 CACHE 1;

CREATE TABLE "public"."cash_movement_category" (
    "id" integer DEFAULT nextval('cash_movement_category_id_seq') NOT NULL,
    "name" character varying(100) NOT NULL,
    "type" character varying(10) NOT NULL,
    "usage_count" integer DEFAULT '1' NOT NULL,
    "created_at" timestamp(0) NOT NULL,
    "last_used_at" timestamp(0) NOT NULL,
    CONSTRAINT "cash_movement_category_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "unique_category_name" UNIQUE ("name")
) WITH (oids = false);


DROP TABLE IF EXISTS "cashbox";
DROP SEQUENCE IF EXISTS cashbox_id_seq;
CREATE SEQUENCE cashbox_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 6 CACHE 1;

CREATE TABLE "public"."cashbox" (
    "id" integer DEFAULT nextval('cashbox_id_seq') NOT NULL,
    "reservation_id" integer,
    "user_id" integer,
    "name" character varying(255) NOT NULL,
    "description" text,
    "currency" character varying(3) DEFAULT 'CZK' NOT NULL,
    "initial_balance" numeric(15,2) DEFAULT '0' NOT NULL,
    "current_balance" numeric(15,2) DEFAULT '0' NOT NULL,
    "opened_at" timestamp(0) NOT NULL,
    "closed_at" timestamp(0),
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" text,
    "event_id" integer,
    "locked_by_user_id" integer,
    "cashbox_type" character varying(20) DEFAULT 'EVENT' NOT NULL,
    "locked_at" timestamp(0),
    CONSTRAINT "cashbox_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_5392812271f7e88b" ON "public"."cashbox" USING btree ("event_id");

CREATE INDEX "idx_53928122a76ed395" ON "public"."cashbox" USING btree ("user_id");

CREATE INDEX "idx_53928122b83297e7" ON "public"."cashbox" USING btree ("reservation_id");

CREATE INDEX "idx_53928122e4c7e49b" ON "public"."cashbox" USING btree ("locked_by_user_id");


DROP TABLE IF EXISTS "cashbox_audit_log";
DROP SEQUENCE IF EXISTS cashbox_audit_log_id_seq;
CREATE SEQUENCE cashbox_audit_log_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 26 CACHE 1;

CREATE TABLE "public"."cashbox_audit_log" (
    "id" integer DEFAULT nextval('cashbox_audit_log_id_seq') NOT NULL,
    "cashbox_id" integer,
    "user_id" integer,
    "action" character varying(50) NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" integer,
    "change_data" json,
    "description" text,
    "ip_address" character varying(45),
    "created_at" timestamp(0) NOT NULL,
    CONSTRAINT "cashbox_audit_log_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_audit_cashbox" ON "public"."cashbox_audit_log" USING btree ("cashbox_id");

CREATE INDEX "idx_audit_created" ON "public"."cashbox_audit_log" USING btree ("created_at");

CREATE INDEX "idx_fe63e6afa76ed395" ON "public"."cashbox_audit_log" USING btree ("user_id");


DROP TABLE IF EXISTS "cashbox_closure";
DROP SEQUENCE IF EXISTS cashbox_closure_id_seq;
CREATE SEQUENCE cashbox_closure_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 8 CACHE 1;

CREATE TABLE "public"."cashbox_closure" (
    "id" integer DEFAULT nextval('cashbox_closure_id_seq') NOT NULL,
    "cashbox_id" integer NOT NULL,
    "closed_by" integer,
    "expected_cash" numeric(15,2) NOT NULL,
    "actual_cash" numeric(15,2) NOT NULL,
    "difference" numeric(15,2),
    "total_income" numeric(15,2) DEFAULT '0' NOT NULL,
    "total_expense" numeric(15,2) DEFAULT '0' NOT NULL,
    "net_result" numeric(15,2),
    "notes" text,
    "closed_at" timestamp(0) NOT NULL,
    CONSTRAINT "cashbox_closure_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_8660ea9261110c8f" ON "public"."cashbox_closure" USING btree ("cashbox_id");

CREATE INDEX "idx_8660ea9288f6e01" ON "public"."cashbox_closure" USING btree ("closed_by");


DROP TABLE IF EXISTS "cashbox_transfer";
DROP SEQUENCE IF EXISTS cashbox_transfer_id_seq;
CREATE SEQUENCE cashbox_transfer_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 5 CACHE 1;

CREATE TABLE "public"."cashbox_transfer" (
    "id" integer DEFAULT nextval('cashbox_transfer_id_seq') NOT NULL,
    "source_cashbox_id" integer NOT NULL,
    "target_event_id" integer NOT NULL,
    "initiated_by_id" integer NOT NULL,
    "confirmed_by_id" integer,
    "amount" numeric(15,2) NOT NULL,
    "currency" character varying(3) DEFAULT 'CZK' NOT NULL,
    "description" character varying(500),
    "status" character varying(20) DEFAULT 'PENDING' NOT NULL,
    "source_movement_id" integer,
    "target_movement_id" integer,
    "refund_movement_id" integer,
    "initiated_at" timestamp(0) NOT NULL,
    "confirmed_at" timestamp(0),
    CONSTRAINT "cashbox_transfer_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_af2fd48d1da57dab" ON "public"."cashbox_transfer" USING btree ("source_cashbox_id");

CREATE INDEX "idx_af2fd48d6f45385d" ON "public"."cashbox_transfer" USING btree ("confirmed_by_id");

CREATE INDEX "idx_af2fd48dab5c38e2" ON "public"."cashbox_transfer" USING btree ("target_event_id");

CREATE INDEX "idx_af2fd48dc4ef1fc7" ON "public"."cashbox_transfer" USING btree ("initiated_by_id");


DROP TABLE IF EXISTS "commission_log";
DROP SEQUENCE IF EXISTS commission_log_id_seq;
CREATE SEQUENCE commission_log_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;

CREATE TABLE "public"."commission_log" (
    "id" integer DEFAULT nextval('commission_log_id_seq') NOT NULL,
    "partner_id" integer NOT NULL,
    "voucher_id" integer,
    "reservation_id" integer,
    "commission_type" character varying(50) NOT NULL,
    "base_amount" numeric(10,2) NOT NULL,
    "commission_rate" numeric(5,2),
    "commission_amount" numeric(10,2) NOT NULL,
    "payment_status" character varying(50) DEFAULT 'PENDING' NOT NULL,
    "payment_method" character varying(50),
    "paid_at" timestamp(0),
    "notes" text,
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    CONSTRAINT "commission_log_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_c1a4ffe828aa1b6f" ON "public"."commission_log" USING btree ("voucher_id");

CREATE INDEX "idx_c1a4ffe89393f8fe" ON "public"."commission_log" USING btree ("partner_id");

CREATE INDEX "idx_c1a4ffe8b83297e7" ON "public"."commission_log" USING btree ("reservation_id");


DROP TABLE IF EXISTS "company_settings";
DROP SEQUENCE IF EXISTS company_settings_id_seq;
CREATE SEQUENCE company_settings_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 2 CACHE 1;

CREATE TABLE "public"."company_settings" (
    "id" integer DEFAULT nextval('company_settings_id_seq') NOT NULL,
    "code" character varying(50) NOT NULL,
    "company_name" character varying(255) NOT NULL,
    "street" character varying(255) NOT NULL,
    "city" character varying(255) NOT NULL,
    "zipcode" character varying(20) NOT NULL,
    "country" character varying(100),
    "ico" character varying(50) NOT NULL,
    "dic" character varying(50),
    "email" character varying(255),
    "phone" character varying(50),
    "web" character varying(255),
    "bank_account" character varying(50),
    "bank_code" character varying(10),
    "bank_name" character varying(255),
    "iban" character varying(50),
    "swift" character varying(20),
    "invoice_prefix" character varying(20) NOT NULL,
    "invoice_next_number" integer NOT NULL,
    "invoice_due_days" integer NOT NULL,
    "default_vat_rate" integer NOT NULL,
    "logo_base64" text,
    "invoice_footer_text" text,
    "registration_info" character varying(255),
    "is_vat_payer" boolean NOT NULL,
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    "deposit_invoice_prefix" character varying(20) NOT NULL,
    "deposit_invoice_next_number" integer NOT NULL,
    "main_cashbox_hidden" boolean DEFAULT false NOT NULL,
    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uniq_fdd2b5a877153098" UNIQUE ("code")
) WITH (oids = false);


DROP TABLE IF EXISTS "contact";
DROP SEQUENCE IF EXISTS contact_id_seq;
CREATE SEQUENCE contact_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1230 CACHE 1;

CREATE TABLE "public"."contact" (
    "id" integer DEFAULT nextval('contact_id_seq') NOT NULL,
    "name" character varying(255) NOT NULL,
    "email" character varying(255),
    "phone" character varying(50),
    "company" character varying(255),
    "note" text,
    "source_reservation_id" integer,
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    "email_normalized" character varying(255),
    "phone_normalized" character varying(20),
    "invoice_name" character varying(255),
    "invoice_email" character varying(255),
    "invoice_phone" character varying(50),
    "invoice_ic" character varying(50),
    "invoice_dic" character varying(50),
    "client_come_from" character varying(255),
    "billing_street" character varying(255),
    "billing_city" character varying(100),
    "billing_zip" character varying(20),
    "billing_country" character varying(100),
    CONSTRAINT "contact_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uniq_4c62e638d5ae72c8" UNIQUE ("email_normalized")
) WITH (oids = false);

CREATE INDEX "contact_email_idx" ON "public"."contact" USING btree ("email");

CREATE INDEX "contact_phone_idx" ON "public"."contact" USING btree ("phone");

CREATE INDEX "contact_phone_normalized_idx" ON "public"."contact" USING btree ("phone_normalized");


DROP TABLE IF EXISTS "disabled_dates";
DROP SEQUENCE IF EXISTS disabled_dates_id_seq;
CREATE SEQUENCE disabled_dates_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;

CREATE TABLE "public"."disabled_dates" (
    "id" integer DEFAULT nextval('disabled_dates_id_seq') NOT NULL,
    "date_from" date NOT NULL,
    "date_to" date,
    "reason" character varying(255),
    "project" character varying(255),
    CONSTRAINT "disabled_dates_pkey" PRIMARY KEY ("id")
) WITH (oids = false);


DROP TABLE IF EXISTS "doctrine_migration_versions";
CREATE TABLE "public"."doctrine_migration_versions" (
    "version" character varying(191) NOT NULL,
    "executed_at" timestamp(0),
    "execution_time" integer,
    CONSTRAINT "doctrine_migration_versions_pkey" PRIMARY KEY ("version")
) WITH (oids = false);


DROP TABLE IF EXISTS "event";
DROP SEQUENCE IF EXISTS event_id_seq;
CREATE SEQUENCE event_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 56 CACHE 1;

CREATE TABLE "public"."event" (
    "id" integer DEFAULT nextval('event_id_seq') NOT NULL,
    "reservation_id" integer,
    "created_by" integer,
    "name" character varying(255) NOT NULL,
    "event_type" character varying(50) NOT NULL,
    "event_date" date NOT NULL,
    "event_time" time(0) without time zone NOT NULL,
    "duration_minutes" integer DEFAULT '120' NOT NULL,
    "guests_paid" integer DEFAULT '0' NOT NULL,
    "guests_free" integer DEFAULT '0',
    "guests_total" integer DEFAULT '0' NOT NULL,
    "venue" character varying(100),
    "organizer_company" character varying(255),
    "organizer_person" character varying(255),
    "organizer_email" character varying(255),
    "organizer_phone" character varying(50),
    "language" character varying(10) DEFAULT 'CZ' NOT NULL,
    "invoice_company" character varying(255),
    "invoice_ic" character varying(20),
    "invoice_dic" character varying(20),
    "invoice_address" text,
    "total_price" numeric(15,2),
    "deposit_amount" numeric(15,2),
    "deposit_paid" boolean DEFAULT false NOT NULL,
    "payment_method" character varying(50),
    "status" character varying(50) DEFAULT 'PLANNED' NOT NULL,
    "notes_staff" text,
    "notes_internal" text,
    "special_requirements" text,
    "coordinator_id" integer,
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    "is_auto_generated" boolean DEFAULT false NOT NULL,
    "event_subcategory" character varying(50),
    "event_tags" json,
    "catering_type" character varying(50),
    "catering_commission_percent" numeric(5,2),
    "catering_commission_amount" numeric(15,2),
    "is_external_coordinator" boolean DEFAULT false NOT NULL,
    "external_coordinator_name" character varying(255),
    "external_coordinator_email" character varying(255),
    "external_coordinator_phone" character varying(50),
    "external_coordinator_note" text,
    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_3bae0aa7b83297e7" ON "public"."event" USING btree ("reservation_id");

CREATE INDEX "idx_3bae0aa7de12ab56" ON "public"."event" USING btree ("created_by");


DROP TABLE IF EXISTS "event_beverage";
DROP SEQUENCE IF EXISTS event_beverage_id_seq;
CREATE SEQUENCE event_beverage_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 61 CACHE 1;

CREATE TABLE "public"."event_beverage" (
    "id" integer DEFAULT nextval('event_beverage_id_seq') NOT NULL,
    "event_id" integer NOT NULL,
    "beverage_name" character varying(255) NOT NULL,
    "quantity" integer DEFAULT '0' NOT NULL,
    "unit" character varying(50) DEFAULT 'bottle' NOT NULL,
    "price_per_unit" numeric(10,2),
    "total_price" numeric(10,2),
    "notes" text,
    "created_at" timestamp(0) NOT NULL,
    CONSTRAINT "event_beverage_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_7b60456b71f7e88b" ON "public"."event_beverage" USING btree ("event_id");


DROP TABLE IF EXISTS "event_guest";
DROP SEQUENCE IF EXISTS event_guest_id_seq;
CREATE SEQUENCE event_guest_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 154514 CACHE 1;

CREATE TABLE "public"."event_guest" (
    "id" integer DEFAULT nextval('event_guest_id_seq') NOT NULL,
    "event_id" integer NOT NULL,
    "event_table_id" integer,
    "reservation_id" integer,
    "menu_item_id" integer,
    "first_name" character varying(100),
    "last_name" character varying(100),
    "nationality" character varying(50),
    "is_paid" boolean DEFAULT true NOT NULL,
    "person_index" integer,
    "type" character varying(20) DEFAULT 'adult' NOT NULL,
    "is_present" boolean DEFAULT false NOT NULL,
    "notes" text,
    "created_at" timestamp(0) NOT NULL,
    "space" character varying(50),
    CONSTRAINT "event_guest_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_edac2b1971f7e88b" ON "public"."event_guest" USING btree ("event_id");

CREATE INDEX "idx_edac2b199ab44fe0" ON "public"."event_guest" USING btree ("menu_item_id");

CREATE INDEX "idx_edac2b19aa13c18c" ON "public"."event_guest" USING btree ("event_table_id");

CREATE INDEX "idx_edac2b19b83297e7" ON "public"."event_guest" USING btree ("reservation_id");


DROP TABLE IF EXISTS "event_invoice";
DROP SEQUENCE IF EXISTS event_invoice_id_seq;
CREATE SEQUENCE event_invoice_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 12 CACHE 1;

CREATE TABLE "public"."event_invoice" (
    "id" integer DEFAULT nextval('event_invoice_id_seq') NOT NULL,
    "event_id" integer NOT NULL,
    "invoice_id" integer NOT NULL,
    "invoice_type" character varying(50) DEFAULT 'deposit' NOT NULL,
    "order_number" integer DEFAULT '1' NOT NULL,
    "notes" text,
    "created_at" timestamp(0) NOT NULL,
    CONSTRAINT "event_invoice_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_1532beeb2989f1fd" ON "public"."event_invoice" USING btree ("invoice_id");

CREATE INDEX "idx_1532beeb71f7e88b" ON "public"."event_invoice" USING btree ("event_id");


DROP TABLE IF EXISTS "event_menu";
DROP SEQUENCE IF EXISTS event_menu_id_seq;
CREATE SEQUENCE event_menu_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 14049 CACHE 1;

CREATE TABLE "public"."event_menu" (
    "id" integer DEFAULT nextval('event_menu_id_seq') NOT NULL,
    "event_id" integer NOT NULL,
    "reservation_food_id" integer,
    "menu_name" character varying(255) NOT NULL,
    "quantity" integer DEFAULT '0' NOT NULL,
    "price_per_unit" numeric(10,2),
    "total_price" numeric(10,2),
    "serving_time" time(0) without time zone,
    "notes" text,
    "created_at" timestamp(0) NOT NULL,
    "reservation_id" integer,
    CONSTRAINT "event_menu_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_62ce763871f7e88b" ON "public"."event_menu" USING btree ("event_id");

CREATE INDEX "idx_62ce7638b83297e7" ON "public"."event_menu" USING btree ("reservation_id");

CREATE INDEX "idx_62ce7638dd1b3c41" ON "public"."event_menu" USING btree ("reservation_food_id");


DROP TABLE IF EXISTS "event_schedule";
DROP SEQUENCE IF EXISTS event_schedule_id_seq;
CREATE SEQUENCE event_schedule_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 2 CACHE 1;

CREATE TABLE "public"."event_schedule" (
    "id" integer DEFAULT nextval('event_schedule_id_seq') NOT NULL,
    "event_id" integer NOT NULL,
    "time_slot" time(0) without time zone NOT NULL,
    "duration_minutes" integer DEFAULT '30' NOT NULL,
    "activity" character varying(255) NOT NULL,
    "description" text,
    "responsible_staff_id" integer,
    "notes" text,
    "created_at" timestamp(0) NOT NULL,
    CONSTRAINT "event_schedule_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_1cd4f82b71f7e88b" ON "public"."event_schedule" USING btree ("event_id");


DROP TABLE IF EXISTS "event_space";
DROP SEQUENCE IF EXISTS event_space_id_seq;
CREATE SEQUENCE event_space_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 50 CACHE 1;

CREATE TABLE "public"."event_space" (
    "id" integer DEFAULT nextval('event_space_id_seq') NOT NULL,
    "event_id" integer NOT NULL,
    "space_name" character varying(50) NOT NULL,
    "created_at" timestamp(0) NOT NULL,
    CONSTRAINT "event_space_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_6869701671f7e88b" ON "public"."event_space" USING btree ("event_id");


DROP TABLE IF EXISTS "event_staff_assignment";
DROP SEQUENCE IF EXISTS event_staff_assignment_id_seq;
CREATE SEQUENCE event_staff_assignment_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 289 CACHE 1;

CREATE TABLE "public"."event_staff_assignment" (
    "id" integer DEFAULT nextval('event_staff_assignment_id_seq') NOT NULL,
    "event_id" integer NOT NULL,
    "staff_member_id" integer NOT NULL,
    "staff_role_id" integer,
    "assignment_status" character varying(50) DEFAULT 'ASSIGNED' NOT NULL,
    "attendance_status" character varying(50) DEFAULT 'PENDING' NOT NULL,
    "hours_worked" numeric(5,2) DEFAULT '0' NOT NULL,
    "payment_amount" numeric(10,2),
    "payment_status" character varying(50) DEFAULT 'PENDING' NOT NULL,
    "notes" text,
    "assigned_at" timestamp(0) NOT NULL,
    "confirmed_at" timestamp(0),
    "attended_at" timestamp(0),
    CONSTRAINT "event_staff_assignment_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_f087b7a371f7e88b" ON "public"."event_staff_assignment" USING btree ("event_id");


DROP TABLE IF EXISTS "event_staff_requirements";
DROP SEQUENCE IF EXISTS event_staff_requirements_id_seq;
CREATE SEQUENCE event_staff_requirements_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 60 CACHE 1;

CREATE TABLE "public"."event_staff_requirements" (
    "id" integer DEFAULT nextval('event_staff_requirements_id_seq') NOT NULL,
    "event_id" integer NOT NULL,
    "category" character varying(50) NOT NULL,
    "required_count" integer NOT NULL,
    "is_manual_override" boolean DEFAULT false NOT NULL,
    "staff_role_id" integer,
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    CONSTRAINT "event_staff_requirements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uniq_cf0a6b5671f7e88b64c19c1" UNIQUE ("event_id", "category")
) WITH (oids = false);

CREATE INDEX "idx_cf0a6b5671f7e88b" ON "public"."event_staff_requirements" USING btree ("event_id");


DROP TABLE IF EXISTS "event_table";
DROP SEQUENCE IF EXISTS event_table_id_seq;
CREATE SEQUENCE event_table_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 117 CACHE 1;

CREATE TABLE "public"."event_table" (
    "id" integer DEFAULT nextval('event_table_id_seq') NOT NULL,
    "event_id" integer NOT NULL,
    "table_name" character varying(100) NOT NULL,
    "room" character varying(50) NOT NULL,
    "capacity" integer DEFAULT '4' NOT NULL,
    "position_x" integer,
    "position_y" integer,
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    CONSTRAINT "event_table_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_b7323e6a71f7e88b" ON "public"."event_table" USING btree ("event_id");


DROP TABLE IF EXISTS "event_tag";
DROP SEQUENCE IF EXISTS event_tag_id_seq;
CREATE SEQUENCE event_tag_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;

CREATE TABLE "public"."event_tag" (
    "id" integer DEFAULT nextval('event_tag_id_seq') NOT NULL,
    "name" character varying(100) NOT NULL,
    "usage_count" integer DEFAULT '1' NOT NULL,
    "created_at" timestamp(0) NOT NULL,
    "last_used_at" timestamp(0) NOT NULL,
    CONSTRAINT "event_tag_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "unique_tag_name" UNIQUE ("name")
) WITH (oids = false);


DROP TABLE IF EXISTS "event_voucher";
DROP SEQUENCE IF EXISTS event_voucher_id_seq;
CREATE SEQUENCE event_voucher_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 2 CACHE 1;

CREATE TABLE "public"."event_voucher" (
    "id" integer DEFAULT nextval('event_voucher_id_seq') NOT NULL,
    "event_id" integer NOT NULL,
    "validated_by" integer,
    "voucher_id" integer NOT NULL,
    "quantity" integer DEFAULT '1' NOT NULL,
    "validated" boolean DEFAULT false NOT NULL,
    "validated_at" timestamp(0),
    "notes" text,
    "created_at" timestamp(0) NOT NULL,
    CONSTRAINT "event_voucher_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_96c50c7771f7e88b" ON "public"."event_voucher" USING btree ("event_id");

CREATE INDEX "idx_96c50c77f54ef1c" ON "public"."event_voucher" USING btree ("validated_by");


DROP TABLE IF EXISTS "food_item_availability";
DROP SEQUENCE IF EXISTS food_item_availability_id_seq;
CREATE SEQUENCE food_item_availability_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;

CREATE TABLE "public"."food_item_availability" (
    "id" integer DEFAULT nextval('food_item_availability_id_seq') NOT NULL,
    "reservation_food_id" integer NOT NULL,
    "date_from" date NOT NULL,
    "date_to" date,
    "available" boolean DEFAULT true NOT NULL,
    "reason" character varying(255),
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    CONSTRAINT "food_item_availability_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_3d198c52dd1b3c41" ON "public"."food_item_availability" USING btree ("reservation_food_id");


DROP TABLE IF EXISTS "food_item_price_override";
DROP SEQUENCE IF EXISTS food_item_price_override_id_seq;
CREATE SEQUENCE food_item_price_override_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;

CREATE TABLE "public"."food_item_price_override" (
    "id" integer DEFAULT nextval('food_item_price_override_id_seq') NOT NULL,
    "reservation_food_id" integer NOT NULL,
    "date_from" date NOT NULL,
    "date_to" date,
    "price" numeric(10,2) NOT NULL,
    "reason" character varying(255),
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    CONSTRAINT "food_item_price_override_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_d7b3bf32dd1b3c41" ON "public"."food_item_price_override" USING btree ("reservation_food_id");


DROP TABLE IF EXISTS "invoice";
DROP SEQUENCE IF EXISTS invoice_id_seq;
CREATE SEQUENCE invoice_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 40 CACHE 1;

CREATE TABLE "public"."invoice" (
    "id" integer DEFAULT nextval('invoice_id_seq') NOT NULL,
    "reservation_id" integer,
    "created_by_id" integer,
    "invoice_number" character varying(50) NOT NULL,
    "issue_date" date NOT NULL,
    "due_date" date NOT NULL,
    "taxable_date" date,
    "status" character varying(20) NOT NULL,
    "supplier_name" character varying(255) NOT NULL,
    "supplier_street" character varying(255) NOT NULL,
    "supplier_city" character varying(255) NOT NULL,
    "supplier_zipcode" character varying(20) NOT NULL,
    "supplier_ico" character varying(50) NOT NULL,
    "supplier_dic" character varying(50),
    "supplier_email" character varying(255),
    "supplier_phone" character varying(50),
    "supplier_bank_account" character varying(255),
    "supplier_bank_name" character varying(255),
    "supplier_iban" character varying(50),
    "supplier_swift" character varying(20),
    "customer_name" character varying(255) NOT NULL,
    "customer_company" character varying(255),
    "customer_street" character varying(255),
    "customer_city" character varying(255),
    "customer_zipcode" character varying(20),
    "customer_ico" character varying(50),
    "customer_dic" character varying(50),
    "customer_email" character varying(255),
    "customer_phone" character varying(50),
    "subtotal" numeric(12,2) NOT NULL,
    "vat_amount" numeric(12,2) NOT NULL,
    "vat_rate" integer NOT NULL,
    "total" numeric(12,2) NOT NULL,
    "currency" character varying(10) NOT NULL,
    "variable_symbol" character varying(50) NOT NULL,
    "qr_payment_data" text,
    "items" json NOT NULL,
    "note" text,
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    "invoice_type" character varying(20) NOT NULL,
    "deposit_percent" numeric(5,2),
    "paid_at" date,
    "original_invoice_id" integer,
    "updated_by" integer,
    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uniq_906517442da68207" UNIQUE ("invoice_number")
) WITH (oids = false);

CREATE INDEX "idx_90651744b03a8386" ON "public"."invoice" USING btree ("created_by_id");

CREATE INDEX "idx_90651744b83297e7" ON "public"."invoice" USING btree ("reservation_id");


DROP TABLE IF EXISTS "menu_recipe";
DROP SEQUENCE IF EXISTS menu_recipe_id_seq;
CREATE SEQUENCE menu_recipe_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 5 CACHE 1;

CREATE TABLE "public"."menu_recipe" (
    "id" integer DEFAULT nextval('menu_recipe_id_seq') NOT NULL,
    "reservation_food_id" integer NOT NULL,
    "recipe_id" integer NOT NULL,
    "portions_per_serving" numeric(5,2) DEFAULT '1.00' NOT NULL,
    "course_type" character varying(50),
    "created_at" timestamp(0) NOT NULL,
    CONSTRAINT "menu_recipe_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uniq_menu_recipe" UNIQUE ("reservation_food_id", "recipe_id")
) WITH (oids = false);

CREATE INDEX "idx_9cfe9ef59d8a214" ON "public"."menu_recipe" USING btree ("recipe_id");

CREATE INDEX "idx_9cfe9efdd1b3c41" ON "public"."menu_recipe" USING btree ("reservation_food_id");


DROP TABLE IF EXISTS "partner";
DROP SEQUENCE IF EXISTS partner_id_seq;
CREATE SEQUENCE partner_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 12 CACHE 1;

CREATE TABLE "public"."partner" (
    "id" integer DEFAULT nextval('partner_id_seq') NOT NULL,
    "name" character varying(255) NOT NULL,
    "partner_type" character varying(50) NOT NULL,
    "contact_person" character varying(255),
    "email" character varying(255),
    "phone" character varying(50),
    "address" text,
    "commission_rate" numeric(5,2) DEFAULT '0' NOT NULL,
    "commission_amount" numeric(10,2) DEFAULT '0' NOT NULL,
    "payment_method" character varying(50),
    "bank_account" character varying(100),
    "ic" character varying(20),
    "dic" character varying(20),
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" text,
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    "pricing_model" character varying(20) DEFAULT 'DEFAULT' NOT NULL,
    "flat_price_adult" numeric(10,2),
    "flat_price_child" numeric(10,2),
    "flat_price_infant" numeric(10,2),
    "custom_menu_prices" json,
    "billing_period" character varying(20) DEFAULT 'PER_RESERVATION' NOT NULL,
    "billing_email" character varying(255),
    "invoice_company" character varying(255),
    "invoice_street" character varying(255),
    "invoice_city" character varying(255),
    "invoice_zipcode" character varying(20),
    "detection_emails" json,
    "detection_keywords" json,
    CONSTRAINT "partner_pkey" PRIMARY KEY ("id")
) WITH (oids = false);


DROP TABLE IF EXISTS "payment";
DROP SEQUENCE IF EXISTS payment_id_seq;
CREATE SEQUENCE payment_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 262 CACHE 1;

CREATE TABLE "public"."payment" (
    "id" integer DEFAULT nextval('payment_id_seq') NOT NULL,
    "transaction_id" character varying(255) NOT NULL,
    "status" character varying(255) NOT NULL,
    "reservation_reference" character varying(255) NOT NULL,
    "created_at" timestamp(0) NOT NULL,
    "amount" double precision NOT NULL,
    "updated_at" timestamp(0),
    "reservation_id" integer,
    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_6d28840db83297e7" ON "public"."payment" USING btree ("reservation_id");


DROP TABLE IF EXISTS "permission";
DROP SEQUENCE IF EXISTS permission_id_seq;
CREATE SEQUENCE permission_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 83 CACHE 1;

CREATE TABLE "public"."permission" (
    "id" integer DEFAULT nextval('permission_id_seq') NOT NULL,
    "module" character varying(50) NOT NULL,
    "action" character varying(30) NOT NULL,
    "description" character varying(255),
    CONSTRAINT "permission_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "unique_permission" UNIQUE ("module", "action")
) WITH (oids = false);


DROP VIEW IF EXISTS "pg_stat_statements";
CREATE TABLE "pg_stat_statements" ("userid" oid, "dbid" oid, "queryid" bigint, "query" text, "calls" bigint, "total_time" double precision, "rows" bigint, "shared_blks_hit" bigint, "shared_blks_read" bigint, "shared_blks_dirtied" bigint, "shared_blks_written" bigint, "local_blks_hit" bigint, "local_blks_read" bigint, "local_blks_dirtied" bigint, "local_blks_written" bigint, "temp_blks_read" bigint, "temp_blks_written" bigint, "blk_read_time" double precision, "blk_write_time" double precision);


DROP TABLE IF EXISTS "pricing_date_override";
DROP SEQUENCE IF EXISTS pricing_date_override_id_seq;
CREATE SEQUENCE pricing_date_override_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 2 CACHE 1;

CREATE TABLE "public"."pricing_date_override" (
    "id" integer DEFAULT nextval('pricing_date_override_id_seq') NOT NULL,
    "date" date NOT NULL,
    "adult_price" numeric(10,2) NOT NULL,
    "child_price" numeric(10,2) NOT NULL,
    "infant_price" numeric(10,2) NOT NULL,
    "include_meal" boolean NOT NULL,
    "reason" character varying(255),
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    CONSTRAINT "pricing_date_override_pkey" PRIMARY KEY ("id")
) WITH (oids = false);


DROP TABLE IF EXISTS "pricing_default";
DROP SEQUENCE IF EXISTS pricing_default_id_seq;
CREATE SEQUENCE pricing_default_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 2 CACHE 1;

CREATE TABLE "public"."pricing_default" (
    "id" integer DEFAULT nextval('pricing_default_id_seq') NOT NULL,
    "adult_price" numeric(10,2) NOT NULL,
    "child_price" numeric(10,2) NOT NULL,
    "infant_price" numeric(10,2) NOT NULL,
    "include_meal" boolean NOT NULL,
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    CONSTRAINT "pricing_default_pkey" PRIMARY KEY ("id")
) WITH (oids = false);


DROP TABLE IF EXISTS "recipe";
DROP SEQUENCE IF EXISTS recipe_id_seq;
CREATE SEQUENCE recipe_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 21 CACHE 1;

CREATE TABLE "public"."recipe" (
    "id" integer DEFAULT nextval('recipe_id_seq') NOT NULL,
    "reservation_food_id" integer,
    "name" character varying(255) NOT NULL,
    "description" text,
    "portions" integer DEFAULT '1' NOT NULL,
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    "portion_weight" numeric(10,2),
    CONSTRAINT "recipe_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_da88b137dd1b3c41" ON "public"."recipe" USING btree ("reservation_food_id");


DROP TABLE IF EXISTS "recipe_ingredient";
DROP SEQUENCE IF EXISTS recipe_ingredient_id_seq;
CREATE SEQUENCE recipe_ingredient_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 134 CACHE 1;

CREATE TABLE "public"."recipe_ingredient" (
    "id" integer DEFAULT nextval('recipe_ingredient_id_seq') NOT NULL,
    "recipe_id" integer NOT NULL,
    "stock_item_id" integer NOT NULL,
    "quantity_required" numeric(10,2) NOT NULL,
    "created_at" timestamp(0) NOT NULL,
    CONSTRAINT "recipe_ingredient_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_22d1fe1359d8a214" ON "public"."recipe_ingredient" USING btree ("recipe_id");

CREATE INDEX "idx_22d1fe13bc942fd" ON "public"."recipe_ingredient" USING btree ("stock_item_id");


DROP TABLE IF EXISTS "reservation";
DROP SEQUENCE IF EXISTS reservation_id_seq;
CREATE SEQUENCE reservation_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 642 CACHE 1;

CREATE TABLE "public"."reservation" (
    "id" integer DEFAULT nextval('reservation_id_seq') NOT NULL,
    "date" date NOT NULL,
    "contact_name" character varying(255) NOT NULL,
    "contact_email" character varying(255) NOT NULL,
    "contact_phone" character varying(50) NOT NULL,
    "contact_nationality" character varying(50) NOT NULL,
    "contact_note" text,
    "invoice_same_as_contact" boolean NOT NULL,
    "invoice_name" character varying(255),
    "invoice_company" character varying(255),
    "invoice_ic" character varying(50),
    "invoice_dic" character varying(50),
    "invoice_email" character varying(255),
    "invoice_phone" character varying(50),
    "transfer_selected" boolean NOT NULL,
    "transfer_count" integer,
    "transfer_address" character varying(255),
    "agreement" boolean NOT NULL,
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    "status" character varying(20) NOT NULL,
    "client_come_from" character varying(255) NOT NULL,
    "invoice_street" character varying(255),
    "invoice_city" character varying(255),
    "invoice_zipcode" character varying(20),
    "invoice_country" character varying(100),
    "source" character varying(20),
    "payment_method" character varying(50),
    "payment_status" character varying(20),
    "deposit_percent" numeric(5,2),
    "deposit_amount" numeric(12,2),
    "total_price" numeric(12,2),
    "paid_amount" numeric(12,2),
    "payment_note" text,
    "reservation_type_id" integer,
    "partner_id" integer,
    CONSTRAINT "reservation_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_42c84955a2d93716" ON "public"."reservation" USING btree ("reservation_type_id");


DROP TABLE IF EXISTS "reservation_foods";
DROP SEQUENCE IF EXISTS reservation_foods_id_seq;
CREATE SEQUENCE reservation_foods_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 22 CACHE 1;

CREATE TABLE "public"."reservation_foods" (
    "id" integer DEFAULT nextval('reservation_foods_id_seq') NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" text,
    "price" integer NOT NULL,
    "is_children_menu" boolean NOT NULL,
    "external_id" character varying(50),
    "surcharge" integer DEFAULT '0' NOT NULL,
    CONSTRAINT "reservation_foods_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uniq_7b7c403a9f75d7b0" UNIQUE ("external_id")
) WITH (oids = false);


DROP TABLE IF EXISTS "reservation_person";
DROP SEQUENCE IF EXISTS reservation_person_id_seq;
CREATE SEQUENCE reservation_person_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 10194 CACHE 1;

CREATE TABLE "public"."reservation_person" (
    "id" integer DEFAULT nextval('reservation_person_id_seq') NOT NULL,
    "reservation_id" integer NOT NULL,
    "type" character varying(20) NOT NULL,
    "menu" character varying(255) NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "nationality" character varying(100),
    CONSTRAINT "reservation_person_pkey" PRIMARY KEY ("id")
) WITH (oids = false);


DROP TABLE IF EXISTS "reservation_transfer";
DROP SEQUENCE IF EXISTS reservation_transfer_id_seq;
CREATE SEQUENCE reservation_transfer_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 6 CACHE 1;

CREATE TABLE "public"."reservation_transfer" (
    "id" integer DEFAULT nextval('reservation_transfer_id_seq') NOT NULL,
    "reservation_id" integer NOT NULL,
    "person_count" integer NOT NULL,
    "address" character varying(500) NOT NULL,
    CONSTRAINT "reservation_transfer_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_dd8141d4b83297e7" ON "public"."reservation_transfer" USING btree ("reservation_id");


DROP TABLE IF EXISTS "reservation_type";
DROP SEQUENCE IF EXISTS reservation_type_id_seq;
CREATE SEQUENCE reservation_type_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 3 CACHE 1;

CREATE TABLE "public"."reservation_type" (
    "id" integer DEFAULT nextval('reservation_type_id_seq') NOT NULL,
    "name" character varying(100) NOT NULL,
    "code" character varying(50) NOT NULL,
    "color" character varying(20) NOT NULL,
    "is_system" boolean NOT NULL,
    "sort_order" integer NOT NULL,
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    "note" character varying(255),
    CONSTRAINT "reservation_type_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uniq_9ae79a4177153098" UNIQUE ("code")
) WITH (oids = false);


DROP TABLE IF EXISTS "role";
DROP SEQUENCE IF EXISTS role_id_seq;
CREATE SEQUENCE role_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 9 CACHE 1;

CREATE TABLE "public"."role" (
    "id" integer DEFAULT nextval('role_id_seq') NOT NULL,
    "name" character varying(50) NOT NULL,
    "display_name" character varying(100),
    "description" text,
    "is_system" boolean DEFAULT false NOT NULL,
    "priority" integer DEFAULT '0' NOT NULL,
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    CONSTRAINT "role_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uniq_57698a6a5e237e06" UNIQUE ("name")
) WITH (oids = false);


DROP TABLE IF EXISTS "role_permission";
DROP SEQUENCE IF EXISTS role_permission_id_seq;
CREATE SEQUENCE role_permission_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 828 CACHE 1;

CREATE TABLE "public"."role_permission" (
    "id" integer DEFAULT nextval('role_permission_id_seq') NOT NULL,
    "role_id" integer NOT NULL,
    "permission_id" integer NOT NULL,
    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "unique_role_permission" UNIQUE ("role_id", "permission_id")
) WITH (oids = false);

CREATE INDEX "idx_6f7df886d60322ac" ON "public"."role_permission" USING btree ("role_id");

CREATE INDEX "idx_6f7df886fed90cca" ON "public"."role_permission" USING btree ("permission_id");


DROP TABLE IF EXISTS "staff_attendance";
DROP SEQUENCE IF EXISTS staff_attendance_id_seq;
CREATE SEQUENCE staff_attendance_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;

CREATE TABLE "public"."staff_attendance" (
    "id" integer DEFAULT nextval('staff_attendance_id_seq') NOT NULL,
    "staff_member_id" integer NOT NULL,
    "reservation_id" integer,
    "attendance_date" date NOT NULL,
    "check_in_time" timestamp(0),
    "check_out_time" timestamp(0),
    "hours_worked" numeric(5,2),
    "notes" text,
    "created_at" timestamp(0) NOT NULL,
    "is_paid" boolean DEFAULT false NOT NULL,
    "paid_at" timestamp(0),
    "event_id" integer,
    "payment_amount" numeric(15,2),
    "payment_note" character varying(255),
    CONSTRAINT "staff_attendance_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_8bb11d4044db03b1" ON "public"."staff_attendance" USING btree ("staff_member_id");

CREATE INDEX "idx_8bb11d40b83297e7" ON "public"."staff_attendance" USING btree ("reservation_id");

COMMENT ON TABLE "public"."staff_attendance" IS 'Evidence docházky personálu';


DROP TABLE IF EXISTS "staff_member";
DROP SEQUENCE IF EXISTS staff_member_id_seq;
CREATE SEQUENCE staff_member_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 49 CACHE 1;

CREATE TABLE "public"."staff_member" (
    "id" integer DEFAULT nextval('staff_member_id_seq') NOT NULL,
    "first_name" character varying(100) NOT NULL,
    "last_name" character varying(100) NOT NULL,
    "email" character varying(255),
    "phone" character varying(50),
    "address" text,
    "date_of_birth" date,
    "position" character varying(100),
    "hourly_rate" numeric(10,2),
    "fixed_rate" numeric(10,2),
    "is_active" boolean DEFAULT true NOT NULL,
    "emergency_contact" character varying(255),
    "emergency_phone" character varying(50),
    "notes" text,
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    "is_group" boolean DEFAULT false NOT NULL,
    "group_size" integer,
    CONSTRAINT "staff_member_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uniq_759948c3e7927c74" UNIQUE ("email")
) WITH (oids = false);

COMMENT ON TABLE "public"."staff_member" IS 'Členové personálu';


DROP TABLE IF EXISTS "staff_member_role";
DROP SEQUENCE IF EXISTS staff_member_role_id_seq;
CREATE SEQUENCE staff_member_role_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;

CREATE TABLE "public"."staff_member_role" (
    "id" integer DEFAULT nextval('staff_member_role_id_seq') NOT NULL,
    "staff_member_id" integer NOT NULL,
    "staff_role_id" integer NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp(0) NOT NULL,
    CONSTRAINT "staff_member_role_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uniq_member_role" UNIQUE ("staff_member_id", "staff_role_id")
) WITH (oids = false);

CREATE INDEX "idx_5ad3166444db03b1" ON "public"."staff_member_role" USING btree ("staff_member_id");

CREATE INDEX "idx_5ad316648ab5351a" ON "public"."staff_member_role" USING btree ("staff_role_id");

COMMENT ON TABLE "public"."staff_member_role" IS 'Přiřazení rolí členům personálu';


DROP TABLE IF EXISTS "staff_reservation_assignment";
DROP SEQUENCE IF EXISTS staff_reservation_assignment_id_seq;
CREATE SEQUENCE staff_reservation_assignment_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;

CREATE TABLE "public"."staff_reservation_assignment" (
    "id" integer DEFAULT nextval('staff_reservation_assignment_id_seq') NOT NULL,
    "staff_member_id" integer NOT NULL,
    "reservation_id" integer NOT NULL,
    "staff_role_id" integer,
    "assignment_status" character varying(50) DEFAULT 'ASSIGNED' NOT NULL,
    "attendance_status" character varying(50) DEFAULT 'PENDING' NOT NULL,
    "hours_worked" numeric(5,2) DEFAULT '0' NOT NULL,
    "payment_amount" numeric(10,2),
    "payment_status" character varying(50) DEFAULT 'PENDING' NOT NULL,
    "notes" text,
    "assigned_at" timestamp(0) NOT NULL,
    "confirmed_at" timestamp(0),
    "attended_at" timestamp(0),
    CONSTRAINT "staff_reservation_assignment_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_cd4d9e5244db03b1" ON "public"."staff_reservation_assignment" USING btree ("staff_member_id");

CREATE INDEX "idx_cd4d9e528ab5351a" ON "public"."staff_reservation_assignment" USING btree ("staff_role_id");

CREATE INDEX "idx_cd4d9e52b83297e7" ON "public"."staff_reservation_assignment" USING btree ("reservation_id");

COMMENT ON TABLE "public"."staff_reservation_assignment" IS 'Přiřazení personálu k rezervacím';


DROP TABLE IF EXISTS "staff_role";
DROP SEQUENCE IF EXISTS staff_role_id_seq;
CREATE SEQUENCE staff_role_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 28 CACHE 1;

CREATE TABLE "public"."staff_role" (
    "id" integer DEFAULT nextval('staff_role_id_seq') NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" text,
    "required_per_guests" integer DEFAULT '0' NOT NULL,
    "guests_ratio" integer DEFAULT '10' NOT NULL,
    "created_at" timestamp(0) NOT NULL,
    CONSTRAINT "staff_role_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uniq_b55ffce55e237e06" UNIQUE ("name")
) WITH (oids = false);

COMMENT ON TABLE "public"."staff_role" IS 'Typy rolí personálu';


DROP TABLE IF EXISTS "staffing_formulas";
DROP SEQUENCE IF EXISTS staffing_formulas_id_seq;
CREATE SEQUENCE staffing_formulas_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 33 CACHE 1;

CREATE TABLE "public"."staffing_formulas" (
    "id" integer DEFAULT nextval('staffing_formulas_id_seq') NOT NULL,
    "category" character varying(50) NOT NULL,
    "ratio" integer NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "description" text,
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    CONSTRAINT "staffing_formulas_pkey" PRIMARY KEY ("id")
) WITH (oids = false);


DROP TABLE IF EXISTS "stock_item";
DROP SEQUENCE IF EXISTS stock_item_id_seq;
CREATE SEQUENCE stock_item_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 64 CACHE 1;

CREATE TABLE "public"."stock_item" (
    "id" integer DEFAULT nextval('stock_item_id_seq') NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" text,
    "unit" character varying(50) DEFAULT 'kg' NOT NULL,
    "quantity_available" numeric(10,2) DEFAULT '0' NOT NULL,
    "min_quantity" numeric(10,2) DEFAULT '0',
    "price_per_unit" numeric(10,2),
    "supplier" character varying(255),
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    CONSTRAINT "stock_item_pkey" PRIMARY KEY ("id")
) WITH (oids = false);


DROP TABLE IF EXISTS "stock_movement";
DROP SEQUENCE IF EXISTS stock_movement_id_seq;
CREATE SEQUENCE stock_movement_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 2 CACHE 1;

CREATE TABLE "public"."stock_movement" (
    "id" integer DEFAULT nextval('stock_movement_id_seq') NOT NULL,
    "stock_item_id" integer NOT NULL,
    "reservation_id" integer,
    "user_id" integer,
    "movement_type" character varying(50) NOT NULL,
    "quantity" numeric(10,2) NOT NULL,
    "reason" text,
    "created_at" timestamp(0) NOT NULL,
    CONSTRAINT "stock_movement_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_bb1bc1b5a76ed395" ON "public"."stock_movement" USING btree ("user_id");

CREATE INDEX "idx_bb1bc1b5b83297e7" ON "public"."stock_movement" USING btree ("reservation_id");

CREATE INDEX "idx_bb1bc1b5bc942fd" ON "public"."stock_movement" USING btree ("stock_item_id");


DROP TABLE IF EXISTS "user";
DROP SEQUENCE IF EXISTS user_id_seq;
CREATE SEQUENCE user_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 13 CACHE 1;

CREATE TABLE "public"."user" (
    "id" integer DEFAULT nextval('user_id_seq') NOT NULL,
    "username" character varying(180) NOT NULL,
    "email" character varying(255) NOT NULL,
    "password" character varying(255) NOT NULL,
    "roles" json NOT NULL,
    "last_login_at" timestamp(0),
    "last_login_ip" character varying(45),
    "reset_token" character varying(64),
    "reset_token_expires_at" timestamp(0),
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    CONSTRAINT "uniq_8d93d649e7927c74" UNIQUE ("email"),
    CONSTRAINT "uniq_8d93d649f85e0677" UNIQUE ("username"),
    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
) WITH (oids = false);


DROP TABLE IF EXISTS "user_login_log";
DROP SEQUENCE IF EXISTS user_login_log_id_seq;
CREATE SEQUENCE user_login_log_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;

CREATE TABLE "public"."user_login_log" (
    "id" integer DEFAULT nextval('user_login_log_id_seq') NOT NULL,
    "user_id" integer NOT NULL,
    "login_at" timestamp(0) NOT NULL,
    "ip_address" character varying(45),
    "user_agent" character varying(255),
    CONSTRAINT "user_login_log_pkey" PRIMARY KEY ("id")
) WITH (oids = false);


DROP TABLE IF EXISTS "user_permission";
DROP SEQUENCE IF EXISTS user_permission_id_seq;
CREATE SEQUENCE user_permission_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;

CREATE TABLE "public"."user_permission" (
    "id" integer DEFAULT nextval('user_permission_id_seq') NOT NULL,
    "user_id" integer NOT NULL,
    "permission_id" integer NOT NULL,
    "assigned_by_id" integer,
    "granted" boolean DEFAULT true NOT NULL,
    "assigned_at" timestamp(0) NOT NULL,
    CONSTRAINT "unique_user_permission" UNIQUE ("user_id", "permission_id"),
    CONSTRAINT "user_permission_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_472e54466e6f1246" ON "public"."user_permission" USING btree ("assigned_by_id");

CREATE INDEX "idx_472e5446a76ed395" ON "public"."user_permission" USING btree ("user_id");

CREATE INDEX "idx_472e5446fed90cca" ON "public"."user_permission" USING btree ("permission_id");


DROP TABLE IF EXISTS "user_role";
DROP SEQUENCE IF EXISTS user_role_id_seq;
CREATE SEQUENCE user_role_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 15 CACHE 1;

CREATE TABLE "public"."user_role" (
    "id" integer DEFAULT nextval('user_role_id_seq') NOT NULL,
    "user_id" integer NOT NULL,
    "role_id" integer NOT NULL,
    "assigned_by_id" integer,
    "assigned_at" timestamp(0) NOT NULL,
    CONSTRAINT "unique_user_role" UNIQUE ("user_id", "role_id"),
    CONSTRAINT "user_role_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_2de8c6a36e6f1246" ON "public"."user_role" USING btree ("assigned_by_id");

CREATE INDEX "idx_2de8c6a3a76ed395" ON "public"."user_role" USING btree ("user_id");

CREATE INDEX "idx_2de8c6a3d60322ac" ON "public"."user_role" USING btree ("role_id");


DROP TABLE IF EXISTS "voucher";
DROP SEQUENCE IF EXISTS voucher_id_seq;
CREATE SEQUENCE voucher_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 21 CACHE 1;

CREATE TABLE "public"."voucher" (
    "id" integer DEFAULT nextval('voucher_id_seq') NOT NULL,
    "partner_id" integer,
    "code" character varying(50) NOT NULL,
    "voucher_type" character varying(50) NOT NULL,
    "discount_value" numeric(10,2),
    "max_uses" integer DEFAULT '1' NOT NULL,
    "current_uses" integer DEFAULT '0' NOT NULL,
    "valid_from" date,
    "valid_to" date,
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" text,
    "created_at" timestamp(0) NOT NULL,
    "updated_at" timestamp(0) NOT NULL,
    CONSTRAINT "uniq_1392a5d877153098" UNIQUE ("code"),
    CONSTRAINT "voucher_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_1392a5d89393f8fe" ON "public"."voucher" USING btree ("partner_id");


DROP TABLE IF EXISTS "voucher_redemption";
DROP SEQUENCE IF EXISTS voucher_redemption_id_seq;
CREATE SEQUENCE voucher_redemption_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;

CREATE TABLE "public"."voucher_redemption" (
    "id" integer DEFAULT nextval('voucher_redemption_id_seq') NOT NULL,
    "voucher_id" integer NOT NULL,
    "reservation_id" integer,
    "redeemed_by" integer,
    "redeemed_at" timestamp(0) NOT NULL,
    "discount_applied" numeric(10,2),
    "original_amount" numeric(10,2),
    "final_amount" numeric(10,2),
    "notes" text,
    CONSTRAINT "voucher_redemption_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "idx_a390504028aa1b6f" ON "public"."voucher_redemption" USING btree ("voucher_id");

CREATE INDEX "idx_a3905040b83297e7" ON "public"."voucher_redemption" USING btree ("reservation_id");

CREATE INDEX "idx_a3905040f203a502" ON "public"."voucher_redemption" USING btree ("redeemed_by");


ALTER TABLE ONLY "public"."cash_movement" ADD CONSTRAINT "fk_965e643a61110c8f" FOREIGN KEY (cashbox_id) REFERENCES cashbox(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."cash_movement" ADD CONSTRAINT "fk_965e643aa76ed395" FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."cash_movement" ADD CONSTRAINT "fk_965e643ab83297e7" FOREIGN KEY (reservation_id) REFERENCES reservation(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."cashbox" ADD CONSTRAINT "fk_5392812271f7e88b" FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."cashbox" ADD CONSTRAINT "fk_53928122a76ed395" FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."cashbox" ADD CONSTRAINT "fk_53928122b83297e7" FOREIGN KEY (reservation_id) REFERENCES reservation(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."cashbox" ADD CONSTRAINT "fk_53928122e4c7e49b" FOREIGN KEY (locked_by_user_id) REFERENCES "user"(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."cashbox_audit_log" ADD CONSTRAINT "fk_fe63e6af61110c8f" FOREIGN KEY (cashbox_id) REFERENCES cashbox(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."cashbox_audit_log" ADD CONSTRAINT "fk_fe63e6afa76ed395" FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."cashbox_closure" ADD CONSTRAINT "fk_8660ea9261110c8f" FOREIGN KEY (cashbox_id) REFERENCES cashbox(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."cashbox_closure" ADD CONSTRAINT "fk_8660ea9288f6e01" FOREIGN KEY (closed_by) REFERENCES "user"(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."cashbox_transfer" ADD CONSTRAINT "fk_af2fd48d1da57dab" FOREIGN KEY (source_cashbox_id) REFERENCES cashbox(id) NOT DEFERRABLE;
ALTER TABLE ONLY "public"."cashbox_transfer" ADD CONSTRAINT "fk_af2fd48d6f45385d" FOREIGN KEY (confirmed_by_id) REFERENCES "user"(id) NOT DEFERRABLE;
ALTER TABLE ONLY "public"."cashbox_transfer" ADD CONSTRAINT "fk_af2fd48dab5c38e2" FOREIGN KEY (target_event_id) REFERENCES event(id) NOT DEFERRABLE;
ALTER TABLE ONLY "public"."cashbox_transfer" ADD CONSTRAINT "fk_af2fd48dc4ef1fc7" FOREIGN KEY (initiated_by_id) REFERENCES "user"(id) NOT DEFERRABLE;

ALTER TABLE ONLY "public"."commission_log" ADD CONSTRAINT "fk_c1a4ffe828aa1b6f" FOREIGN KEY (voucher_id) REFERENCES voucher(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."commission_log" ADD CONSTRAINT "fk_c1a4ffe89393f8fe" FOREIGN KEY (partner_id) REFERENCES partner(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."commission_log" ADD CONSTRAINT "fk_c1a4ffe8b83297e7" FOREIGN KEY (reservation_id) REFERENCES reservation(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event" ADD CONSTRAINT "fk_3bae0aa7b83297e7" FOREIGN KEY (reservation_id) REFERENCES reservation(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."event" ADD CONSTRAINT "fk_3bae0aa7de12ab56" FOREIGN KEY (created_by) REFERENCES "user"(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_beverage" ADD CONSTRAINT "fk_7b60456b71f7e88b" FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_guest" ADD CONSTRAINT "fk_edac2b1971f7e88b" FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."event_guest" ADD CONSTRAINT "fk_edac2b199ab44fe0" FOREIGN KEY (menu_item_id) REFERENCES event_menu(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."event_guest" ADD CONSTRAINT "fk_edac2b19aa13c18c" FOREIGN KEY (event_table_id) REFERENCES event_table(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."event_guest" ADD CONSTRAINT "fk_edac2b19b83297e7" FOREIGN KEY (reservation_id) REFERENCES reservation(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_invoice" ADD CONSTRAINT "fk_1532beeb2989f1fd" FOREIGN KEY (invoice_id) REFERENCES invoice(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."event_invoice" ADD CONSTRAINT "fk_1532beeb71f7e88b" FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_menu" ADD CONSTRAINT "fk_62ce763871f7e88b" FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."event_menu" ADD CONSTRAINT "fk_62ce7638b83297e7" FOREIGN KEY (reservation_id) REFERENCES reservation(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."event_menu" ADD CONSTRAINT "fk_62ce7638dd1b3c41" FOREIGN KEY (reservation_food_id) REFERENCES reservation_foods(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_schedule" ADD CONSTRAINT "fk_1cd4f82b71f7e88b" FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_space" ADD CONSTRAINT "fk_6869701671f7e88b" FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_staff_assignment" ADD CONSTRAINT "fk_f087b7a371f7e88b" FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_staff_requirements" ADD CONSTRAINT "fk_cf0a6b5671f7e88b" FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_table" ADD CONSTRAINT "fk_b7323e6a71f7e88b" FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."event_voucher" ADD CONSTRAINT "fk_96c50c7771f7e88b" FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."event_voucher" ADD CONSTRAINT "fk_96c50c77f54ef1c" FOREIGN KEY (validated_by) REFERENCES "user"(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."food_item_availability" ADD CONSTRAINT "fk_3d198c52dd1b3c41" FOREIGN KEY (reservation_food_id) REFERENCES reservation_foods(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."food_item_price_override" ADD CONSTRAINT "fk_d7b3bf32dd1b3c41" FOREIGN KEY (reservation_food_id) REFERENCES reservation_foods(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."invoice" ADD CONSTRAINT "fk_90651744b03a8386" FOREIGN KEY (created_by_id) REFERENCES "user"(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."invoice" ADD CONSTRAINT "fk_90651744b83297e7" FOREIGN KEY (reservation_id) REFERENCES reservation(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."menu_recipe" ADD CONSTRAINT "fk_9cfe9ef59d8a214" FOREIGN KEY (recipe_id) REFERENCES recipe(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."menu_recipe" ADD CONSTRAINT "fk_9cfe9efdd1b3c41" FOREIGN KEY (reservation_food_id) REFERENCES reservation_foods(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."payment" ADD CONSTRAINT "fk_6d28840db83297e7" FOREIGN KEY (reservation_id) REFERENCES reservation(id) NOT DEFERRABLE;

ALTER TABLE ONLY "public"."recipe" ADD CONSTRAINT "fk_da88b137dd1b3c41" FOREIGN KEY (reservation_food_id) REFERENCES reservation_foods(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."recipe_ingredient" ADD CONSTRAINT "fk_22d1fe1359d8a214" FOREIGN KEY (recipe_id) REFERENCES recipe(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."recipe_ingredient" ADD CONSTRAINT "fk_22d1fe13bc942fd" FOREIGN KEY (stock_item_id) REFERENCES stock_item(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."reservation" ADD CONSTRAINT "fk_42c84955a2d93716" FOREIGN KEY (reservation_type_id) REFERENCES reservation_type(id) NOT DEFERRABLE;

ALTER TABLE ONLY "public"."reservation_person" ADD CONSTRAINT "fk_reservation_person_reservation" FOREIGN KEY (reservation_id) REFERENCES reservation(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."reservation_transfer" ADD CONSTRAINT "fk_dd8141d4b83297e7" FOREIGN KEY (reservation_id) REFERENCES reservation(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."role_permission" ADD CONSTRAINT "fk_6f7df886d60322ac" FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."role_permission" ADD CONSTRAINT "fk_6f7df886fed90cca" FOREIGN KEY (permission_id) REFERENCES permission(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."staff_attendance" ADD CONSTRAINT "fk_8bb11d4044db03b1" FOREIGN KEY (staff_member_id) REFERENCES staff_member(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."staff_attendance" ADD CONSTRAINT "fk_8bb11d40b83297e7" FOREIGN KEY (reservation_id) REFERENCES reservation(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."staff_member_role" ADD CONSTRAINT "fk_5ad3166444db03b1" FOREIGN KEY (staff_member_id) REFERENCES staff_member(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."staff_member_role" ADD CONSTRAINT "fk_5ad316648ab5351a" FOREIGN KEY (staff_role_id) REFERENCES staff_role(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."staff_reservation_assignment" ADD CONSTRAINT "fk_cd4d9e5244db03b1" FOREIGN KEY (staff_member_id) REFERENCES staff_member(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."staff_reservation_assignment" ADD CONSTRAINT "fk_cd4d9e528ab5351a" FOREIGN KEY (staff_role_id) REFERENCES staff_role(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."staff_reservation_assignment" ADD CONSTRAINT "fk_cd4d9e52b83297e7" FOREIGN KEY (reservation_id) REFERENCES reservation(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."stock_movement" ADD CONSTRAINT "fk_bb1bc1b5a76ed395" FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."stock_movement" ADD CONSTRAINT "fk_bb1bc1b5b83297e7" FOREIGN KEY (reservation_id) REFERENCES reservation(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."stock_movement" ADD CONSTRAINT "fk_bb1bc1b5bc942fd" FOREIGN KEY (stock_item_id) REFERENCES stock_item(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."user_login_log" ADD CONSTRAINT "fk_user_login_log_user" FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."user_permission" ADD CONSTRAINT "fk_472e54466e6f1246" FOREIGN KEY (assigned_by_id) REFERENCES "user"(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."user_permission" ADD CONSTRAINT "fk_472e5446a76ed395" FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."user_permission" ADD CONSTRAINT "fk_472e5446fed90cca" FOREIGN KEY (permission_id) REFERENCES permission(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."user_role" ADD CONSTRAINT "fk_2de8c6a36e6f1246" FOREIGN KEY (assigned_by_id) REFERENCES "user"(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."user_role" ADD CONSTRAINT "fk_2de8c6a3a76ed395" FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."user_role" ADD CONSTRAINT "fk_2de8c6a3d60322ac" FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."voucher" ADD CONSTRAINT "fk_1392a5d89393f8fe" FOREIGN KEY (partner_id) REFERENCES partner(id) ON DELETE SET NULL NOT DEFERRABLE;

ALTER TABLE ONLY "public"."voucher_redemption" ADD CONSTRAINT "fk_a390504028aa1b6f" FOREIGN KEY (voucher_id) REFERENCES voucher(id) ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."voucher_redemption" ADD CONSTRAINT "fk_a3905040b83297e7" FOREIGN KEY (reservation_id) REFERENCES reservation(id) ON DELETE SET NULL NOT DEFERRABLE;
ALTER TABLE ONLY "public"."voucher_redemption" ADD CONSTRAINT "fk_a3905040f203a502" FOREIGN KEY (redeemed_by) REFERENCES "user"(id) ON DELETE SET NULL NOT DEFERRABLE;

DROP TABLE IF EXISTS "pg_stat_statements";
CREATE VIEW "pg_stat_statements" AS SELECT pg_stat_statements.userid,
    pg_stat_statements.dbid,
    pg_stat_statements.queryid,
    pg_stat_statements.query,
    pg_stat_statements.calls,
    pg_stat_statements.total_time,
    pg_stat_statements.rows,
    pg_stat_statements.shared_blks_hit,
    pg_stat_statements.shared_blks_read,
    pg_stat_statements.shared_blks_dirtied,
    pg_stat_statements.shared_blks_written,
    pg_stat_statements.local_blks_hit,
    pg_stat_statements.local_blks_read,
    pg_stat_statements.local_blks_dirtied,
    pg_stat_statements.local_blks_written,
    pg_stat_statements.temp_blks_read,
    pg_stat_statements.temp_blks_written,
    pg_stat_statements.blk_read_time,
    pg_stat_statements.blk_write_time
   FROM pg_stat_statements(true) pg_stat_statements(userid, dbid, queryid, query, calls, total_time, rows, shared_blks_hit, shared_blks_read, shared_blks_dirtied, shared_blks_written, local_blks_hit, local_blks_read, local_blks_dirtied, local_blks_written, temp_blks_read, temp_blks_written, blk_read_time, blk_write_time);

-- 2026-03-27 10:33:18.68346+01
