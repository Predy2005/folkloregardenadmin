<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260304130145 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            ALTER TABLE cash_movement ADD staff_member_id INT DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cash_movement ADD event_staff_assignment_id INT DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox ADD event_id INT DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox ADD locked_by_user_id INT DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox ADD cashbox_type VARCHAR(20) DEFAULT 'EVENT' NOT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox ADD locked_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox ADD CONSTRAINT FK_5392812271F7E88B FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox ADD CONSTRAINT FK_53928122E4C7E49B FOREIGN KEY (locked_by_user_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_5392812271F7E88B ON cashbox (event_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_53928122E4C7E49B ON cashbox (locked_by_user_id)
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE company_settings ADD main_cashbox_hidden BOOLEAN DEFAULT false NOT NULL
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE company_settings DROP main_cashbox_hidden
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox DROP CONSTRAINT FK_5392812271F7E88B
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox DROP CONSTRAINT FK_53928122E4C7E49B
        SQL);
        $this->addSql(<<<'SQL'
            DROP INDEX IDX_5392812271F7E88B
        SQL);
        $this->addSql(<<<'SQL'
            DROP INDEX IDX_53928122E4C7E49B
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox DROP event_id
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox DROP locked_by_user_id
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox DROP cashbox_type
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox DROP locked_at
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cash_movement DROP staff_member_id
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cash_movement DROP event_staff_assignment_id
        SQL);
    }
}
