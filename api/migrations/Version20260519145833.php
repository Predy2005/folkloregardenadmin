<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Recovery migrace — `Version20260518071658` byla auto-generovaná `migrations:diff`
 * z drift detection mezi entitou a DB. Mezi mnoha kosmetickými ALTER INDEX
 * renames bohužel dropla DVA legitimní partial unique indexy:
 *   - uniq_partner_api_key_hash (Version20260515093000, prod migrace tamtéž)
 *   - uniq_partner_swagger_username (Version20260516100000, prod migrace tamtéž)
 *
 * Bez nich Postgres nevynucuje unikátnost API klíčů ani Swagger usernames →
 * dva partneři by mohli sdílet hash a auth lookup se začne chovat
 * nedeterministicky. Tahle migrace je obnoví IF NOT EXISTS — tj. na prod
 * (kde Version20260518071658 nikdy neběžela přes `prod_migrations/`)
 * indexy už jsou a migrace je no-op.
 */
final class Version20260519145833 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Recovery — re-create partial unique indexes uniq_partner_api_key_hash + uniq_partner_swagger_username';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE UNIQUE INDEX IF NOT EXISTS uniq_partner_api_key_hash
                ON partner (api_key_hash)
                WHERE api_key_hash IS NOT NULL
        SQL);
        $this->addSql(<<<'SQL'
            CREATE UNIQUE INDEX IF NOT EXISTS uniq_partner_swagger_username
                ON partner (swagger_username)
                WHERE swagger_username IS NOT NULL
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS uniq_partner_swagger_username');
        $this->addSql('DROP INDEX IF EXISTS uniq_partner_api_key_hash');
    }
}
