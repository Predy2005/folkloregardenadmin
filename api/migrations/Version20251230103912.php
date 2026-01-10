<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20251230103912 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE permission (id SERIAL NOT NULL, module VARCHAR(50) NOT NULL, action VARCHAR(30) NOT NULL, description VARCHAR(255) DEFAULT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE UNIQUE INDEX unique_permission ON permission (module, action)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE TABLE role (id SERIAL NOT NULL, name VARCHAR(50) NOT NULL, display_name VARCHAR(100) DEFAULT NULL, description TEXT DEFAULT NULL, is_system BOOLEAN DEFAULT false NOT NULL, priority INT DEFAULT 0 NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE UNIQUE INDEX UNIQ_57698A6A5E237E06 ON role (name)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE TABLE role_permission (id SERIAL NOT NULL, role_id INT NOT NULL, permission_id INT NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_6F7DF886D60322AC ON role_permission (role_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_6F7DF886FED90CCA ON role_permission (permission_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE UNIQUE INDEX unique_role_permission ON role_permission (role_id, permission_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE TABLE user_permission (id SERIAL NOT NULL, user_id INT NOT NULL, permission_id INT NOT NULL, assigned_by_id INT DEFAULT NULL, granted BOOLEAN DEFAULT true NOT NULL, assigned_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_472E5446A76ED395 ON user_permission (user_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_472E5446FED90CCA ON user_permission (permission_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_472E54466E6F1246 ON user_permission (assigned_by_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE UNIQUE INDEX unique_user_permission ON user_permission (user_id, permission_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE TABLE user_role (id SERIAL NOT NULL, user_id INT NOT NULL, role_id INT NOT NULL, assigned_by_id INT DEFAULT NULL, assigned_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_2DE8C6A3A76ED395 ON user_role (user_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_2DE8C6A3D60322AC ON user_role (role_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_2DE8C6A36E6F1246 ON user_role (assigned_by_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE UNIQUE INDEX unique_user_role ON user_role (user_id, role_id)
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE role_permission ADD CONSTRAINT FK_6F7DF886D60322AC FOREIGN KEY (role_id) REFERENCES role (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE role_permission ADD CONSTRAINT FK_6F7DF886FED90CCA FOREIGN KEY (permission_id) REFERENCES permission (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE user_permission ADD CONSTRAINT FK_472E5446A76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE user_permission ADD CONSTRAINT FK_472E5446FED90CCA FOREIGN KEY (permission_id) REFERENCES permission (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE user_permission ADD CONSTRAINT FK_472E54466E6F1246 FOREIGN KEY (assigned_by_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE user_role ADD CONSTRAINT FK_2DE8C6A3A76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE user_role ADD CONSTRAINT FK_2DE8C6A3D60322AC FOREIGN KEY (role_id) REFERENCES role (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE user_role ADD CONSTRAINT FK_2DE8C6A36E6F1246 FOREIGN KEY (assigned_by_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE role_permission DROP CONSTRAINT FK_6F7DF886D60322AC
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE role_permission DROP CONSTRAINT FK_6F7DF886FED90CCA
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE user_permission DROP CONSTRAINT FK_472E5446A76ED395
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE user_permission DROP CONSTRAINT FK_472E5446FED90CCA
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE user_permission DROP CONSTRAINT FK_472E54466E6F1246
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE user_role DROP CONSTRAINT FK_2DE8C6A3A76ED395
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE user_role DROP CONSTRAINT FK_2DE8C6A3D60322AC
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE user_role DROP CONSTRAINT FK_2DE8C6A36E6F1246
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE permission
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE role
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE role_permission
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE user_permission
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE user_role
        SQL);
    }
}
