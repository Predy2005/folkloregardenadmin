<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Vytváří `partner_category` (číselník kategorií partnerů) a seeduje 4 default
 * položky: TRAVEL_AGENCY, GUIDE, HOTEL, OTHER. Existující sloty `RECEPTION`
 * a `DISTRIBUTOR` migrujeme na `OTHER`, aby zmizely z dropdownu, ale partneři
 * neztratili identifikaci.
 */
final class Version20260428114400 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add partner_category table and seed 4 default categories';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE partner_category (
                id SERIAL NOT NULL,
                name VARCHAR(100) NOT NULL,
                slug VARCHAR(50) NOT NULL,
                display_order INT DEFAULT 0 NOT NULL,
                is_active BOOLEAN DEFAULT true NOT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                PRIMARY KEY(id)
            )
        SQL);
        $this->addSql('CREATE UNIQUE INDEX UNIQ_partner_category_slug ON partner_category (slug)');

        $this->addSql(<<<'SQL'
            INSERT INTO partner_category (name, slug, display_order, is_active, created_at) VALUES
                ('Cestovní kancelář', 'TRAVEL_AGENCY', 10, true, NOW()),
                ('Průvodce', 'GUIDE', 20, true, NOW()),
                ('Hotel', 'HOTEL', 30, true, NOW()),
                ('Ostatní', 'OTHER', 40, true, NOW())
        SQL);

        // Re-mapování existujících partnerů ze starých enum hodnot na nový set.
        // RECEPTION a DISTRIBUTOR neexistují jako kategorie → mapujeme na OTHER,
        // aby si je administrace ručně přeřadila.
        $this->addSql("UPDATE partner SET partner_type = 'OTHER' WHERE partner_type IN ('RECEPTION', 'DISTRIBUTOR')");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE partner_category');
        // Reverse mapping není zachován (původní hodnota se ztrácí); manuálně.
    }
}
