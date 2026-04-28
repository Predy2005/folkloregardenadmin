<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260415090000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'AI Assistant: documentation_topic + assistant_action_log tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE documentation_topic (
                id SERIAL PRIMARY KEY,
                slug VARCHAR(120) NOT NULL,
                title VARCHAR(200) NOT NULL,
                category VARCHAR(80) NOT NULL,
                content TEXT NOT NULL,
                keywords JSON NOT NULL,
                related_routes JSON NOT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
            )
        SQL);
        $this->addSql('CREATE UNIQUE INDEX UNIQ_DOC_TOPIC_SLUG ON documentation_topic (slug)');
        $this->addSql('CREATE INDEX doc_topic_slug_idx ON documentation_topic (slug)');
        $this->addSql('CREATE INDEX doc_topic_category_idx ON documentation_topic (category)');

        $this->addSql(<<<'SQL'
            CREATE TABLE assistant_action_log (
                id SERIAL PRIMARY KEY,
                action_id VARCHAR(64) NOT NULL,
                user_id INT DEFAULT NULL,
                tool_name VARCHAR(80) NOT NULL,
                status VARCHAR(20) NOT NULL,
                params JSON NOT NULL,
                result JSON DEFAULT NULL,
                preview TEXT DEFAULT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                executed_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL
            )
        SQL);
        $this->addSql('CREATE UNIQUE INDEX UNIQ_AAL_ACTION_ID ON assistant_action_log (action_id)');
        $this->addSql('CREATE INDEX aal_action_id_idx ON assistant_action_log (action_id)');
        $this->addSql('CREATE INDEX aal_user_idx ON assistant_action_log (user_id)');
        $this->addSql('CREATE INDEX aal_created_idx ON assistant_action_log (created_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS assistant_action_log');
        $this->addSql('DROP TABLE IF EXISTS documentation_topic');
    }
}
