<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Mobile app support: mobile PIN login, staff/driver ↔ user linking,
 * FCM device registry, transport execution status.
 */
final class Version20260423100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Mobile auth: user.mobile_pin/pin_device_id/pin_enabled, staff_member.user_id, transport_driver.user_id, user_device table, event_transport.execution_status.';
    }

    public function up(Schema $schema): void
    {
        // 1) User — mobile PIN fields
        $this->addSql('ALTER TABLE "user" ADD COLUMN mobile_pin VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE "user" ADD COLUMN pin_device_id VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE "user" ADD COLUMN pin_enabled BOOLEAN NOT NULL DEFAULT FALSE');

        // 2) StaffMember ↔ User (OneToOne, nullable)
        $this->addSql('ALTER TABLE staff_member ADD COLUMN user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE staff_member ADD CONSTRAINT fk_staff_member_user FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE SET NULL');
        $this->addSql('CREATE UNIQUE INDEX uniq_staff_member_user ON staff_member (user_id)');

        // 3) TransportDriver ↔ User (OneToOne, nullable)
        $this->addSql('ALTER TABLE transport_driver ADD COLUMN user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE transport_driver ADD CONSTRAINT fk_transport_driver_user FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE SET NULL');
        $this->addSql('CREATE UNIQUE INDEX uniq_transport_driver_user ON transport_driver (user_id)');

        // 4) UserDevice — FCM push registry
        $this->addSql(<<<'SQL'
            CREATE TABLE user_device (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                fcm_token VARCHAR(500) NOT NULL,
                platform VARCHAR(20) NOT NULL,
                device_id VARCHAR(255) DEFAULT NULL,
                device_name VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                last_seen_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
            )
        SQL);
        $this->addSql('ALTER TABLE user_device ADD CONSTRAINT fk_user_device_user FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE');
        $this->addSql('CREATE UNIQUE INDEX uniq_user_device_token ON user_device (fcm_token)');
        $this->addSql('CREATE INDEX idx_user_device_user ON user_device (user_id)');

        // 5) EventTransport — execution status for driver mobile app
        $this->addSql('ALTER TABLE event_transport ADD COLUMN execution_status VARCHAR(30) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE event_transport DROP COLUMN execution_status');

        $this->addSql('DROP TABLE IF EXISTS user_device');

        $this->addSql('ALTER TABLE transport_driver DROP CONSTRAINT IF EXISTS fk_transport_driver_user');
        $this->addSql('DROP INDEX IF EXISTS uniq_transport_driver_user');
        $this->addSql('ALTER TABLE transport_driver DROP COLUMN user_id');

        $this->addSql('ALTER TABLE staff_member DROP CONSTRAINT IF EXISTS fk_staff_member_user');
        $this->addSql('DROP INDEX IF EXISTS uniq_staff_member_user');
        $this->addSql('ALTER TABLE staff_member DROP COLUMN user_id');

        $this->addSql('ALTER TABLE "user" DROP COLUMN pin_enabled');
        $this->addSql('ALTER TABLE "user" DROP COLUMN pin_device_id');
        $this->addSql('ALTER TABLE "user" DROP COLUMN mobile_pin');
    }
}
