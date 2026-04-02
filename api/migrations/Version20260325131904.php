<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260325131904 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE building (id SERIAL NOT NULL, name VARCHAR(100) NOT NULL, slug VARCHAR(50) NOT NULL, description TEXT DEFAULT NULL, sort_order INT DEFAULT 0 NOT NULL, is_active BOOLEAN DEFAULT true NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE UNIQUE INDEX UNIQ_E16F61D4989D9B62 ON building (slug)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE TABLE floor_plan_element (id SERIAL NOT NULL, event_id INT NOT NULL, room_id INT DEFAULT NULL, element_type VARCHAR(30) NOT NULL, label VARCHAR(100) DEFAULT NULL, position_x DOUBLE PRECISION DEFAULT '0' NOT NULL, position_y DOUBLE PRECISION DEFAULT '0' NOT NULL, width_px DOUBLE PRECISION DEFAULT '100' NOT NULL, height_px DOUBLE PRECISION DEFAULT '100' NOT NULL, rotation DOUBLE PRECISION DEFAULT '0' NOT NULL, shape VARCHAR(20) DEFAULT 'rectangle' NOT NULL, shape_data JSON DEFAULT NULL, color VARCHAR(7) DEFAULT NULL, sort_order INT DEFAULT 0 NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_689DADF671F7E88B ON floor_plan_element (event_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_689DADF654177093 ON floor_plan_element (room_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE TABLE floor_plan_template (id SERIAL NOT NULL, room_id INT DEFAULT NULL, created_by INT DEFAULT NULL, name VARCHAR(255) NOT NULL, description TEXT DEFAULT NULL, layout_data JSON NOT NULL, is_default BOOLEAN DEFAULT false NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_9C921D5154177093 ON floor_plan_template (room_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_9C921D51DE12AB56 ON floor_plan_template (created_by)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE TABLE room (id SERIAL NOT NULL, building_id INT NOT NULL, name VARCHAR(100) NOT NULL, slug VARCHAR(50) NOT NULL, width_cm INT DEFAULT 1000 NOT NULL, height_cm INT DEFAULT 800 NOT NULL, shape_data JSON DEFAULT NULL, color VARCHAR(7) DEFAULT NULL, sort_order INT DEFAULT 0 NOT NULL, is_active BOOLEAN DEFAULT true NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_729F519B4D2A7E12 ON room (building_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE TABLE table_expense (id SERIAL NOT NULL, event_table_id INT NOT NULL, event_id INT NOT NULL, created_by INT DEFAULT NULL, description VARCHAR(255) NOT NULL, category VARCHAR(50) DEFAULT 'other' NOT NULL, quantity INT DEFAULT 1 NOT NULL, unit_price NUMERIC(10, 2) NOT NULL, total_price NUMERIC(10, 2) NOT NULL, currency VARCHAR(3) DEFAULT 'CZK' NOT NULL, is_paid BOOLEAN DEFAULT false NOT NULL, paid_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_2F09CCA9AA13C18C ON table_expense (event_table_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_2F09CCA971F7E88B ON table_expense (event_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_2F09CCA9DE12AB56 ON table_expense (created_by)
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE floor_plan_element ADD CONSTRAINT FK_689DADF671F7E88B FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE floor_plan_element ADD CONSTRAINT FK_689DADF654177093 FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE floor_plan_template ADD CONSTRAINT FK_9C921D5154177093 FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE floor_plan_template ADD CONSTRAINT FK_9C921D51DE12AB56 FOREIGN KEY (created_by) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE room ADD CONSTRAINT FK_729F519B4D2A7E12 FOREIGN KEY (building_id) REFERENCES building (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE table_expense ADD CONSTRAINT FK_2F09CCA9AA13C18C FOREIGN KEY (event_table_id) REFERENCES event_table (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE table_expense ADD CONSTRAINT FK_2F09CCA971F7E88B FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE table_expense ADD CONSTRAINT FK_2F09CCA9DE12AB56 FOREIGN KEY (created_by) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_guest ADD room_id INT DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_guest ADD CONSTRAINT FK_EDAC2B1954177093 FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_EDAC2B1954177093 ON event_guest (room_id)
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_space ADD room_id INT DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_space ADD CONSTRAINT FK_6869701654177093 FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_6869701654177093 ON event_space (room_id)
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table ADD room_id INT DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table ADD shape VARCHAR(20) DEFAULT 'round' NOT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table ADD width_px DOUBLE PRECISION DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table ADD height_px DOUBLE PRECISION DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table ADD rotation DOUBLE PRECISION DEFAULT '0' NOT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table ADD table_number INT DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table ADD color VARCHAR(7) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table ADD sort_order INT DEFAULT 0 NOT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table ALTER position_x TYPE DOUBLE PRECISION
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table ALTER position_y TYPE DOUBLE PRECISION
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table ADD CONSTRAINT FK_B7323E6A54177093 FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_B7323E6A54177093 ON event_table (room_id)
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_guest DROP CONSTRAINT FK_EDAC2B1954177093
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_space DROP CONSTRAINT FK_6869701654177093
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table DROP CONSTRAINT FK_B7323E6A54177093
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE floor_plan_element DROP CONSTRAINT FK_689DADF671F7E88B
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE floor_plan_element DROP CONSTRAINT FK_689DADF654177093
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE floor_plan_template DROP CONSTRAINT FK_9C921D5154177093
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE floor_plan_template DROP CONSTRAINT FK_9C921D51DE12AB56
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE room DROP CONSTRAINT FK_729F519B4D2A7E12
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE table_expense DROP CONSTRAINT FK_2F09CCA9AA13C18C
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE table_expense DROP CONSTRAINT FK_2F09CCA971F7E88B
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE table_expense DROP CONSTRAINT FK_2F09CCA9DE12AB56
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE building
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE floor_plan_element
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE floor_plan_template
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE room
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE table_expense
        SQL);
        $this->addSql(<<<'SQL'
            DROP INDEX IDX_EDAC2B1954177093
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_guest DROP room_id
        SQL);
        $this->addSql(<<<'SQL'
            DROP INDEX IDX_6869701654177093
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_space DROP room_id
        SQL);
        $this->addSql(<<<'SQL'
            DROP INDEX IDX_B7323E6A54177093
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table DROP room_id
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table DROP shape
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table DROP width_px
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table DROP height_px
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table DROP rotation
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table DROP table_number
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table DROP color
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table DROP sort_order
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table ALTER position_x TYPE INT
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_table ALTER position_y TYPE INT
        SQL);
    }
}
