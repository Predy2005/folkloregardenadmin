<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260304152841 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE cashbox_transfer (id SERIAL NOT NULL, source_cashbox_id INT NOT NULL, target_event_id INT NOT NULL, initiated_by_id INT NOT NULL, confirmed_by_id INT DEFAULT NULL, amount NUMERIC(15, 2) NOT NULL, currency VARCHAR(3) DEFAULT 'CZK' NOT NULL, description VARCHAR(500) DEFAULT NULL, status VARCHAR(20) DEFAULT 'PENDING' NOT NULL, source_movement_id INT DEFAULT NULL, target_movement_id INT DEFAULT NULL, refund_movement_id INT DEFAULT NULL, initiated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, confirmed_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_AF2FD48D1DA57DAB ON cashbox_transfer (source_cashbox_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_AF2FD48DAB5C38E2 ON cashbox_transfer (target_event_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_AF2FD48DC4EF1FC7 ON cashbox_transfer (initiated_by_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_AF2FD48D6F45385D ON cashbox_transfer (confirmed_by_id)
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox_transfer ADD CONSTRAINT FK_AF2FD48D1DA57DAB FOREIGN KEY (source_cashbox_id) REFERENCES cashbox (id) NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox_transfer ADD CONSTRAINT FK_AF2FD48DAB5C38E2 FOREIGN KEY (target_event_id) REFERENCES event (id) NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox_transfer ADD CONSTRAINT FK_AF2FD48DC4EF1FC7 FOREIGN KEY (initiated_by_id) REFERENCES "user" (id) NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox_transfer ADD CONSTRAINT FK_AF2FD48D6F45385D FOREIGN KEY (confirmed_by_id) REFERENCES "user" (id) NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox_transfer DROP CONSTRAINT FK_AF2FD48D1DA57DAB
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox_transfer DROP CONSTRAINT FK_AF2FD48DAB5C38E2
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox_transfer DROP CONSTRAINT FK_AF2FD48DC4EF1FC7
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox_transfer DROP CONSTRAINT FK_AF2FD48D6F45385D
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE cashbox_transfer
        SQL);
    }
}
