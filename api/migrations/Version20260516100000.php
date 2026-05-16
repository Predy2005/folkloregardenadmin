<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260516100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Partner Swagger UI Basic Auth credentials — swagger_username + swagger_password_hash + swagger_credentials_generated_at on partner';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE partner ADD swagger_username VARCHAR(64) DEFAULT NULL');
        $this->addSql('ALTER TABLE partner ADD swagger_password_hash VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE partner ADD swagger_credentials_generated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('CREATE UNIQUE INDEX uniq_partner_swagger_username ON partner (swagger_username) WHERE swagger_username IS NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS uniq_partner_swagger_username');
        $this->addSql('ALTER TABLE partner DROP COLUMN IF EXISTS swagger_credentials_generated_at');
        $this->addSql('ALTER TABLE partner DROP COLUMN IF EXISTS swagger_password_hash');
        $this->addSql('ALTER TABLE partner DROP COLUMN IF EXISTS swagger_username');
    }
}
