<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20251111134229 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE cash_movement (id SERIAL NOT NULL, cashbox_id INT NOT NULL, reservation_id INT DEFAULT NULL, user_id INT DEFAULT NULL, movement_type VARCHAR(50) NOT NULL, category VARCHAR(100) DEFAULT NULL, amount NUMERIC(15, 2) NOT NULL, currency VARCHAR(3) DEFAULT 'CZK' NOT NULL, description TEXT DEFAULT NULL, payment_method VARCHAR(50) DEFAULT NULL, reference_id VARCHAR(100) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_965E643A61110C8F ON cash_movement (cashbox_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_965E643AB83297E7 ON cash_movement (reservation_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_965E643AA76ED395 ON cash_movement (user_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE cashbox (id SERIAL NOT NULL, reservation_id INT DEFAULT NULL, user_id INT DEFAULT NULL, name VARCHAR(255) NOT NULL, description TEXT DEFAULT NULL, currency VARCHAR(3) DEFAULT 'CZK' NOT NULL, initial_balance NUMERIC(15, 2) DEFAULT '0' NOT NULL, current_balance NUMERIC(15, 2) DEFAULT '0' NOT NULL, opened_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, closed_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, is_active BOOLEAN DEFAULT true NOT NULL, notes TEXT DEFAULT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_53928122B83297E7 ON cashbox (reservation_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_53928122A76ED395 ON cashbox (user_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE cashbox_closure (id SERIAL NOT NULL, cashbox_id INT NOT NULL, closed_by INT DEFAULT NULL, expected_cash NUMERIC(15, 2) NOT NULL, actual_cash NUMERIC(15, 2) NOT NULL, difference NUMERIC(15, 2) DEFAULT NULL, total_income NUMERIC(15, 2) DEFAULT '0' NOT NULL, total_expense NUMERIC(15, 2) DEFAULT '0' NOT NULL, net_result NUMERIC(15, 2) DEFAULT NULL, notes TEXT DEFAULT NULL, closed_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_8660EA9261110C8F ON cashbox_closure (cashbox_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_8660EA9288F6E01 ON cashbox_closure (closed_by)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE commission_log (id SERIAL NOT NULL, partner_id INT NOT NULL, voucher_id INT DEFAULT NULL, reservation_id INT DEFAULT NULL, commission_type VARCHAR(50) NOT NULL, base_amount NUMERIC(10, 2) NOT NULL, commission_rate NUMERIC(5, 2) DEFAULT NULL, commission_amount NUMERIC(10, 2) NOT NULL, payment_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL, payment_method VARCHAR(50) DEFAULT NULL, paid_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, notes TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_C1A4FFE89393F8FE ON commission_log (partner_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_C1A4FFE828AA1B6F ON commission_log (voucher_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_C1A4FFE8B83297E7 ON commission_log (reservation_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE event (id SERIAL NOT NULL, reservation_id INT DEFAULT NULL, created_by INT DEFAULT NULL, name VARCHAR(255) NOT NULL, event_type VARCHAR(50) NOT NULL, event_date DATE NOT NULL, event_time TIME(0) WITHOUT TIME ZONE NOT NULL, duration_minutes INT DEFAULT 120 NOT NULL, guests_paid INT DEFAULT 0 NOT NULL, guests_free INT DEFAULT 0, guests_total INT DEFAULT 0 NOT NULL, venue VARCHAR(100) DEFAULT NULL, organizer_company VARCHAR(255) DEFAULT NULL, organizer_person VARCHAR(255) DEFAULT NULL, organizer_email VARCHAR(255) DEFAULT NULL, organizer_phone VARCHAR(50) DEFAULT NULL, language VARCHAR(10) DEFAULT 'CZ' NOT NULL, invoice_company VARCHAR(255) DEFAULT NULL, invoice_ic VARCHAR(20) DEFAULT NULL, invoice_dic VARCHAR(20) DEFAULT NULL, invoice_address TEXT DEFAULT NULL, total_price NUMERIC(15, 2) DEFAULT NULL, deposit_amount NUMERIC(15, 2) DEFAULT NULL, deposit_paid BOOLEAN DEFAULT false NOT NULL, payment_method VARCHAR(50) DEFAULT NULL, status VARCHAR(50) DEFAULT 'PLANNED' NOT NULL, notes_staff TEXT DEFAULT NULL, notes_internal TEXT DEFAULT NULL, special_requirements TEXT DEFAULT NULL, coordinator_id INT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_3BAE0AA7B83297E7 ON event (reservation_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_3BAE0AA7DE12AB56 ON event (created_by)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE event_beverage (id SERIAL NOT NULL, event_id INT NOT NULL, beverage_name VARCHAR(255) NOT NULL, quantity INT DEFAULT 0 NOT NULL, unit VARCHAR(50) DEFAULT 'bottle' NOT NULL, price_per_unit NUMERIC(10, 2) DEFAULT NULL, total_price NUMERIC(10, 2) DEFAULT NULL, notes TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_7B60456B71F7E88B ON event_beverage (event_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE event_guest (id SERIAL NOT NULL, event_id INT NOT NULL, event_table_id INT DEFAULT NULL, reservation_id INT DEFAULT NULL, menu_item_id INT DEFAULT NULL, first_name VARCHAR(100) DEFAULT NULL, last_name VARCHAR(100) DEFAULT NULL, nationality VARCHAR(50) DEFAULT NULL, is_paid BOOLEAN DEFAULT true NOT NULL, person_index INT DEFAULT NULL, type VARCHAR(20) DEFAULT 'adult' NOT NULL, is_present BOOLEAN DEFAULT false NOT NULL, notes TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_EDAC2B1971F7E88B ON event_guest (event_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_EDAC2B19AA13C18C ON event_guest (event_table_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_EDAC2B19B83297E7 ON event_guest (reservation_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_EDAC2B199AB44FE0 ON event_guest (menu_item_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE event_menu (id SERIAL NOT NULL, event_id INT NOT NULL, reservation_food_id INT DEFAULT NULL, menu_name VARCHAR(255) NOT NULL, quantity INT DEFAULT 0 NOT NULL, price_per_unit NUMERIC(10, 2) DEFAULT NULL, total_price NUMERIC(10, 2) DEFAULT NULL, serving_time TIME(0) WITHOUT TIME ZONE DEFAULT NULL, notes TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_62CE763871F7E88B ON event_menu (event_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_62CE7638DD1B3C41 ON event_menu (reservation_food_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE event_schedule (id SERIAL NOT NULL, event_id INT NOT NULL, time_slot TIME(0) WITHOUT TIME ZONE NOT NULL, duration_minutes INT DEFAULT 30 NOT NULL, activity VARCHAR(255) NOT NULL, description TEXT DEFAULT NULL, responsible_staff_id INT DEFAULT NULL, notes TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_1CD4F82B71F7E88B ON event_schedule (event_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE event_space (id SERIAL NOT NULL, event_id INT NOT NULL, space_name VARCHAR(50) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_6869701671F7E88B ON event_space (event_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE event_staff_assignment (id SERIAL NOT NULL, event_id INT NOT NULL, staff_member_id INT NOT NULL, staff_role_id INT DEFAULT NULL, assignment_status VARCHAR(50) DEFAULT 'ASSIGNED' NOT NULL, attendance_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL, hours_worked NUMERIC(5, 2) DEFAULT '0' NOT NULL, payment_amount NUMERIC(10, 2) DEFAULT NULL, payment_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL, notes TEXT DEFAULT NULL, assigned_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, confirmed_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, attended_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_F087B7A371F7E88B ON event_staff_assignment (event_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE event_table (id SERIAL NOT NULL, event_id INT NOT NULL, table_name VARCHAR(100) NOT NULL, room VARCHAR(50) NOT NULL, capacity INT DEFAULT 4 NOT NULL, position_x INT DEFAULT NULL, position_y INT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_B7323E6A71F7E88B ON event_table (event_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE event_voucher (id SERIAL NOT NULL, event_id INT NOT NULL, validated_by INT DEFAULT NULL, voucher_id INT NOT NULL, quantity INT DEFAULT 1 NOT NULL, validated BOOLEAN DEFAULT false NOT NULL, validated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, notes TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_96C50C7771F7E88B ON event_voucher (event_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_96C50C77F54EF1C ON event_voucher (validated_by)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE food_item_availability (id SERIAL NOT NULL, reservation_food_id INT NOT NULL, date_from DATE NOT NULL, date_to DATE DEFAULT NULL, available BOOLEAN DEFAULT true NOT NULL, reason VARCHAR(255) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_3D198C52DD1B3C41 ON food_item_availability (reservation_food_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE food_item_price_override (id SERIAL NOT NULL, reservation_food_id INT NOT NULL, date_from DATE NOT NULL, date_to DATE DEFAULT NULL, price NUMERIC(10, 2) NOT NULL, reason VARCHAR(255) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_D7B3BF32DD1B3C41 ON food_item_price_override (reservation_food_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE partner (id SERIAL NOT NULL, name VARCHAR(255) NOT NULL, partner_type VARCHAR(50) NOT NULL, contact_person VARCHAR(255) DEFAULT NULL, email VARCHAR(255) DEFAULT NULL, phone VARCHAR(50) DEFAULT NULL, address TEXT DEFAULT NULL, commission_rate NUMERIC(5, 2) DEFAULT '0' NOT NULL, commission_amount NUMERIC(10, 2) DEFAULT '0' NOT NULL, payment_method VARCHAR(50) DEFAULT NULL, bank_account VARCHAR(100) DEFAULT NULL, ic VARCHAR(20) DEFAULT NULL, dic VARCHAR(20) DEFAULT NULL, is_active BOOLEAN DEFAULT true NOT NULL, notes TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE recipe (id SERIAL NOT NULL, reservation_food_id INT DEFAULT NULL, name VARCHAR(255) NOT NULL, description TEXT DEFAULT NULL, portions INT DEFAULT 1 NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_DA88B137DD1B3C41 ON recipe (reservation_food_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE recipe_ingredient (id SERIAL NOT NULL, recipe_id INT NOT NULL, stock_item_id INT NOT NULL, quantity_required NUMERIC(10, 2) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_22D1FE1359D8A214 ON recipe_ingredient (recipe_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_22D1FE13BC942FD ON recipe_ingredient (stock_item_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE staff_attendance (id SERIAL NOT NULL, staff_member_id INT NOT NULL, reservation_id INT DEFAULT NULL, attendance_date DATE NOT NULL, check_in_time TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, check_out_time TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, hours_worked NUMERIC(5, 2) DEFAULT NULL, notes TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_8BB11D4044DB03B1 ON staff_attendance (staff_member_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_8BB11D40B83297E7 ON staff_attendance (reservation_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE staff_member (id SERIAL NOT NULL, first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL, email VARCHAR(255) DEFAULT NULL, phone VARCHAR(50) DEFAULT NULL, address TEXT DEFAULT NULL, date_of_birth DATE DEFAULT NULL, position VARCHAR(100) DEFAULT NULL, hourly_rate NUMERIC(10, 2) DEFAULT NULL, fixed_rate NUMERIC(10, 2) DEFAULT NULL, is_active BOOLEAN DEFAULT true NOT NULL, emergency_contact VARCHAR(255) DEFAULT NULL, emergency_phone VARCHAR(50) DEFAULT NULL, notes TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE UNIQUE INDEX UNIQ_759948C3E7927C74 ON staff_member (email)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE staff_member_role (id SERIAL NOT NULL, staff_member_id INT NOT NULL, staff_role_id INT NOT NULL, is_primary BOOLEAN DEFAULT false NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_5AD3166444DB03B1 ON staff_member_role (staff_member_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_5AD316648AB5351A ON staff_member_role (staff_role_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE UNIQUE INDEX uniq_member_role ON staff_member_role (staff_member_id, staff_role_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE staff_reservation_assignment (id SERIAL NOT NULL, staff_member_id INT NOT NULL, reservation_id INT NOT NULL, staff_role_id INT DEFAULT NULL, assignment_status VARCHAR(50) DEFAULT 'ASSIGNED' NOT NULL, attendance_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL, hours_worked NUMERIC(5, 2) DEFAULT '0' NOT NULL, payment_amount NUMERIC(10, 2) DEFAULT NULL, payment_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL, notes TEXT DEFAULT NULL, assigned_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, confirmed_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, attended_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_CD4D9E5244DB03B1 ON staff_reservation_assignment (staff_member_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_CD4D9E52B83297E7 ON staff_reservation_assignment (reservation_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_CD4D9E528AB5351A ON staff_reservation_assignment (staff_role_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE staff_role (id SERIAL NOT NULL, name VARCHAR(100) NOT NULL, description TEXT DEFAULT NULL, required_per_guests INT DEFAULT 0 NOT NULL, guests_ratio INT DEFAULT 10 NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE UNIQUE INDEX UNIQ_B55FFCE55E237E06 ON staff_role (name)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE staffing_formulas (id SERIAL NOT NULL, category VARCHAR(50) NOT NULL, ratio INT NOT NULL, enabled BOOLEAN DEFAULT true NOT NULL, description TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE stock_item (id SERIAL NOT NULL, name VARCHAR(255) NOT NULL, description TEXT DEFAULT NULL, unit VARCHAR(50) DEFAULT 'kg' NOT NULL, quantity_available NUMERIC(10, 2) DEFAULT '0' NOT NULL, min_quantity NUMERIC(10, 2) DEFAULT '0', price_per_unit NUMERIC(10, 2) DEFAULT NULL, supplier VARCHAR(255) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE stock_movement (id SERIAL NOT NULL, stock_item_id INT NOT NULL, reservation_id INT DEFAULT NULL, user_id INT DEFAULT NULL, movement_type VARCHAR(50) NOT NULL, quantity NUMERIC(10, 2) NOT NULL, reason TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_BB1BC1B5BC942FD ON stock_movement (stock_item_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_BB1BC1B5B83297E7 ON stock_movement (reservation_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_BB1BC1B5A76ED395 ON stock_movement (user_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE voucher (id SERIAL NOT NULL, partner_id INT DEFAULT NULL, code VARCHAR(50) NOT NULL, voucher_type VARCHAR(50) NOT NULL, discount_value NUMERIC(10, 2) DEFAULT NULL, max_uses INT DEFAULT 1 NOT NULL, current_uses INT DEFAULT 0 NOT NULL, valid_from DATE DEFAULT NULL, valid_to DATE DEFAULT NULL, is_active BOOLEAN DEFAULT true NOT NULL, notes TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE UNIQUE INDEX UNIQ_1392A5D877153098 ON voucher (code)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_1392A5D89393F8FE ON voucher (partner_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE TABLE voucher_redemption (id SERIAL NOT NULL, voucher_id INT NOT NULL, reservation_id INT DEFAULT NULL, redeemed_by INT DEFAULT NULL, redeemed_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, discount_applied NUMERIC(10, 2) DEFAULT NULL, original_amount NUMERIC(10, 2) DEFAULT NULL, final_amount NUMERIC(10, 2) DEFAULT NULL, notes TEXT DEFAULT NULL, PRIMARY KEY(id))
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_A390504028AA1B6F ON voucher_redemption (voucher_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_A3905040B83297E7 ON voucher_redemption (reservation_id)
        SQL
        );
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_A3905040F203A502 ON voucher_redemption (redeemed_by)
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE cash_movement ADD CONSTRAINT FK_965E643A61110C8F FOREIGN KEY (cashbox_id) REFERENCES cashbox (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE cash_movement ADD CONSTRAINT FK_965E643AB83297E7 FOREIGN KEY (reservation_id) REFERENCES reservation (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE cash_movement ADD CONSTRAINT FK_965E643AA76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox ADD CONSTRAINT FK_53928122B83297E7 FOREIGN KEY (reservation_id) REFERENCES reservation (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox ADD CONSTRAINT FK_53928122A76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox_closure ADD CONSTRAINT FK_8660EA9261110C8F FOREIGN KEY (cashbox_id) REFERENCES cashbox (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox_closure ADD CONSTRAINT FK_8660EA9288F6E01 FOREIGN KEY (closed_by) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE commission_log ADD CONSTRAINT FK_C1A4FFE89393F8FE FOREIGN KEY (partner_id) REFERENCES partner (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE commission_log ADD CONSTRAINT FK_C1A4FFE828AA1B6F FOREIGN KEY (voucher_id) REFERENCES voucher (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE commission_log ADD CONSTRAINT FK_C1A4FFE8B83297E7 FOREIGN KEY (reservation_id) REFERENCES reservation (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event ADD CONSTRAINT FK_3BAE0AA7B83297E7 FOREIGN KEY (reservation_id) REFERENCES reservation (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event ADD CONSTRAINT FK_3BAE0AA7DE12AB56 FOREIGN KEY (created_by) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_beverage ADD CONSTRAINT FK_7B60456B71F7E88B FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_guest ADD CONSTRAINT FK_EDAC2B1971F7E88B FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_guest ADD CONSTRAINT FK_EDAC2B19AA13C18C FOREIGN KEY (event_table_id) REFERENCES event_table (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_guest ADD CONSTRAINT FK_EDAC2B19B83297E7 FOREIGN KEY (reservation_id) REFERENCES reservation (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_guest ADD CONSTRAINT FK_EDAC2B199AB44FE0 FOREIGN KEY (menu_item_id) REFERENCES event_menu (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_menu ADD CONSTRAINT FK_62CE763871F7E88B FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_menu ADD CONSTRAINT FK_62CE7638DD1B3C41 FOREIGN KEY (reservation_food_id) REFERENCES reservation_foods (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_schedule ADD CONSTRAINT FK_1CD4F82B71F7E88B FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_space ADD CONSTRAINT FK_6869701671F7E88B FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_staff_assignment ADD CONSTRAINT FK_F087B7A371F7E88B FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table ADD CONSTRAINT FK_B7323E6A71F7E88B FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_voucher ADD CONSTRAINT FK_96C50C7771F7E88B FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_voucher ADD CONSTRAINT FK_96C50C77F54EF1C FOREIGN KEY (validated_by) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE food_item_availability ADD CONSTRAINT FK_3D198C52DD1B3C41 FOREIGN KEY (reservation_food_id) REFERENCES reservation_foods (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE food_item_price_override ADD CONSTRAINT FK_D7B3BF32DD1B3C41 FOREIGN KEY (reservation_food_id) REFERENCES reservation_foods (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE recipe ADD CONSTRAINT FK_DA88B137DD1B3C41 FOREIGN KEY (reservation_food_id) REFERENCES reservation_foods (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE recipe_ingredient ADD CONSTRAINT FK_22D1FE1359D8A214 FOREIGN KEY (recipe_id) REFERENCES recipe (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE recipe_ingredient ADD CONSTRAINT FK_22D1FE13BC942FD FOREIGN KEY (stock_item_id) REFERENCES stock_item (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_attendance ADD CONSTRAINT FK_8BB11D4044DB03B1 FOREIGN KEY (staff_member_id) REFERENCES staff_member (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_attendance ADD CONSTRAINT FK_8BB11D40B83297E7 FOREIGN KEY (reservation_id) REFERENCES reservation (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_member_role ADD CONSTRAINT FK_5AD3166444DB03B1 FOREIGN KEY (staff_member_id) REFERENCES staff_member (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_member_role ADD CONSTRAINT FK_5AD316648AB5351A FOREIGN KEY (staff_role_id) REFERENCES staff_role (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_reservation_assignment ADD CONSTRAINT FK_CD4D9E5244DB03B1 FOREIGN KEY (staff_member_id) REFERENCES staff_member (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_reservation_assignment ADD CONSTRAINT FK_CD4D9E52B83297E7 FOREIGN KEY (reservation_id) REFERENCES reservation (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_reservation_assignment ADD CONSTRAINT FK_CD4D9E528AB5351A FOREIGN KEY (staff_role_id) REFERENCES staff_role (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE stock_movement ADD CONSTRAINT FK_BB1BC1B5BC942FD FOREIGN KEY (stock_item_id) REFERENCES stock_item (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE stock_movement ADD CONSTRAINT FK_BB1BC1B5B83297E7 FOREIGN KEY (reservation_id) REFERENCES reservation (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE stock_movement ADD CONSTRAINT FK_BB1BC1B5A76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE voucher ADD CONSTRAINT FK_1392A5D89393F8FE FOREIGN KEY (partner_id) REFERENCES partner (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE voucher_redemption ADD CONSTRAINT FK_A390504028AA1B6F FOREIGN KEY (voucher_id) REFERENCES voucher (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE voucher_redemption ADD CONSTRAINT FK_A3905040B83297E7 FOREIGN KEY (reservation_id) REFERENCES reservation (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE voucher_redemption ADD CONSTRAINT FK_A3905040F203A502 FOREIGN KEY (redeemed_by) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL
        );
        $this->addSql("UPDATE reservation SET client_come_from = '' WHERE client_come_from IS NULL");

        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ALTER client_come_from TYPE VARCHAR(255)
        SQL
        );

        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ALTER client_come_from SET NOT NULL
        SQL
        );
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE cash_movement DROP CONSTRAINT FK_965E643A61110C8F
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE cash_movement DROP CONSTRAINT FK_965E643AB83297E7
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE cash_movement DROP CONSTRAINT FK_965E643AA76ED395
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox DROP CONSTRAINT FK_53928122B83297E7
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox DROP CONSTRAINT FK_53928122A76ED395
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox_closure DROP CONSTRAINT FK_8660EA9261110C8F
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox_closure DROP CONSTRAINT FK_8660EA9288F6E01
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE commission_log DROP CONSTRAINT FK_C1A4FFE89393F8FE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE commission_log DROP CONSTRAINT FK_C1A4FFE828AA1B6F
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE commission_log DROP CONSTRAINT FK_C1A4FFE8B83297E7
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event DROP CONSTRAINT FK_3BAE0AA7B83297E7
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event DROP CONSTRAINT FK_3BAE0AA7DE12AB56
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_beverage DROP CONSTRAINT FK_7B60456B71F7E88B
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_guest DROP CONSTRAINT FK_EDAC2B1971F7E88B
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_guest DROP CONSTRAINT FK_EDAC2B19AA13C18C
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_guest DROP CONSTRAINT FK_EDAC2B19B83297E7
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_guest DROP CONSTRAINT FK_EDAC2B199AB44FE0
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_menu DROP CONSTRAINT FK_62CE763871F7E88B
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_menu DROP CONSTRAINT FK_62CE7638DD1B3C41
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_schedule DROP CONSTRAINT FK_1CD4F82B71F7E88B
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_space DROP CONSTRAINT FK_6869701671F7E88B
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_staff_assignment DROP CONSTRAINT FK_F087B7A371F7E88B
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table DROP CONSTRAINT FK_B7323E6A71F7E88B
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_voucher DROP CONSTRAINT FK_96C50C7771F7E88B
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE event_voucher DROP CONSTRAINT FK_96C50C77F54EF1C
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE food_item_availability DROP CONSTRAINT FK_3D198C52DD1B3C41
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE food_item_price_override DROP CONSTRAINT FK_D7B3BF32DD1B3C41
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE recipe DROP CONSTRAINT FK_DA88B137DD1B3C41
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE recipe_ingredient DROP CONSTRAINT FK_22D1FE1359D8A214
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE recipe_ingredient DROP CONSTRAINT FK_22D1FE13BC942FD
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_attendance DROP CONSTRAINT FK_8BB11D4044DB03B1
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_attendance DROP CONSTRAINT FK_8BB11D40B83297E7
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_member_role DROP CONSTRAINT FK_5AD3166444DB03B1
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_member_role DROP CONSTRAINT FK_5AD316648AB5351A
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_reservation_assignment DROP CONSTRAINT FK_CD4D9E5244DB03B1
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_reservation_assignment DROP CONSTRAINT FK_CD4D9E52B83297E7
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_reservation_assignment DROP CONSTRAINT FK_CD4D9E528AB5351A
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE stock_movement DROP CONSTRAINT FK_BB1BC1B5BC942FD
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE stock_movement DROP CONSTRAINT FK_BB1BC1B5B83297E7
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE stock_movement DROP CONSTRAINT FK_BB1BC1B5A76ED395
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE voucher DROP CONSTRAINT FK_1392A5D89393F8FE
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE voucher_redemption DROP CONSTRAINT FK_A390504028AA1B6F
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE voucher_redemption DROP CONSTRAINT FK_A3905040B83297E7
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE voucher_redemption DROP CONSTRAINT FK_A3905040F203A502
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE cash_movement
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE cashbox
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE cashbox_closure
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE commission_log
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE event
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE event_beverage
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE event_guest
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE event_menu
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE event_schedule
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE event_space
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE event_staff_assignment
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE event_table
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE event_voucher
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE food_item_availability
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE food_item_price_override
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE partner
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE recipe
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE recipe_ingredient
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE staff_attendance
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE staff_member
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE staff_member_role
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE staff_reservation_assignment
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE staff_role
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE staffing_formulas
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE stock_item
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE stock_movement
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE voucher
        SQL
        );
        $this->addSql(<<<'SQL'
            DROP TABLE voucher_redemption
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ALTER client_come_from DROP NOT NULL
        SQL
        );
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ALTER client_come_from TYPE VARCHAR(50)
        SQL
        );
    }
}
