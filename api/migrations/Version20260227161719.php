<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260227161719 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE menu_recipe (id SERIAL NOT NULL, reservation_food_id INT NOT NULL, recipe_id INT NOT NULL, portions_per_serving NUMERIC(5, 2) DEFAULT '1.00' NOT NULL, course_type VARCHAR(50) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_9CFE9EFDD1B3C41 ON menu_recipe (reservation_food_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_9CFE9EF59D8A214 ON menu_recipe (recipe_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE UNIQUE INDEX UNIQ_MENU_RECIPE ON menu_recipe (reservation_food_id, recipe_id)
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE menu_recipe ADD CONSTRAINT FK_9CFE9EFDD1B3C41 FOREIGN KEY (reservation_food_id) REFERENCES reservation_foods (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE menu_recipe ADD CONSTRAINT FK_9CFE9EF59D8A214 FOREIGN KEY (recipe_id) REFERENCES recipe (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE menu_recipe DROP CONSTRAINT FK_9CFE9EFDD1B3C41
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE menu_recipe DROP CONSTRAINT FK_9CFE9EF59D8A214
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE menu_recipe
        SQL);
    }
}
