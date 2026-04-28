<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260415090200 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'AI Assistant: assistant_conversation (chat history persistence).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE assistant_conversation (
                id SERIAL PRIMARY KEY,
                user_id INT DEFAULT NULL,
                title VARCHAR(200) NOT NULL,
                messages JSON NOT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
            )
        SQL);
        $this->addSql('CREATE INDEX ac_user_idx ON assistant_conversation (user_id)');
        $this->addSql('CREATE INDEX ac_updated_idx ON assistant_conversation (updated_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS assistant_conversation');
    }
}
