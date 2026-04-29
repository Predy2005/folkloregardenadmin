<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Vytváří modul Tickety / TODO list — interní hlášení chyb v systému.
 *
 * - 3 tabulky: ticket, ticket_comment, ticket_attachment
 * - Seed 5 permissions: tickets.read/create/update/delete/comment
 * - Napojení na ROLE_ADMIN (full set) a (volitelně) ROLE_MANAGER (read/create/comment)
 *   — pokud role neexistují, vazby se přeskočí.
 */
final class Version20260429120611 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add ticket/todo module with permissions seed';
    }

    public function up(Schema $schema): void
    {
        // ── Tabulky ───────────────────────────────────────────────
        $this->addSql(<<<'SQL'
            CREATE TABLE ticket (
                id SERIAL NOT NULL,
                created_by_id INT DEFAULT NULL,
                assigned_to_id INT DEFAULT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT DEFAULT NULL,
                status VARCHAR(30) NOT NULL,
                priority VARCHAR(20) NOT NULL,
                type VARCHAR(20) NOT NULL,
                source VARCHAR(30) NOT NULL,
                module VARCHAR(50) DEFAULT NULL,
                error_hash VARCHAR(64) DEFAULT NULL,
                error_class VARCHAR(255) DEFAULT NULL,
                stack_trace TEXT DEFAULT NULL,
                request_url VARCHAR(500) DEFAULT NULL,
                http_status INT DEFAULT NULL,
                occurrence_count INT DEFAULT 1 NOT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                resolved_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                last_occurrence_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                PRIMARY KEY(id)
            )
        SQL);
        $this->addSql('CREATE UNIQUE INDEX UNIQ_ticket_error_hash ON ticket (error_hash)');
        $this->addSql('CREATE INDEX IDX_ticket_created_by ON ticket (created_by_id)');
        $this->addSql('CREATE INDEX IDX_ticket_assigned_to ON ticket (assigned_to_id)');

        $this->addSql(<<<'SQL'
            CREATE TABLE ticket_comment (
                id SERIAL NOT NULL,
                ticket_id INT NOT NULL,
                author_id INT DEFAULT NULL,
                content TEXT NOT NULL,
                is_internal BOOLEAN DEFAULT false NOT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                PRIMARY KEY(id)
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_ticket_comment_ticket ON ticket_comment (ticket_id)');
        $this->addSql('CREATE INDEX IDX_ticket_comment_author ON ticket_comment (author_id)');

        $this->addSql(<<<'SQL'
            CREATE TABLE ticket_attachment (
                id SERIAL NOT NULL,
                ticket_id INT NOT NULL,
                comment_id INT DEFAULT NULL,
                uploaded_by_id INT DEFAULT NULL,
                filename VARCHAR(255) NOT NULL,
                mime_type VARCHAR(100) NOT NULL,
                size_bytes INT NOT NULL,
                storage_path VARCHAR(500) NOT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                PRIMARY KEY(id)
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_ticket_attachment_ticket ON ticket_attachment (ticket_id)');
        $this->addSql('CREATE INDEX IDX_ticket_attachment_comment ON ticket_attachment (comment_id)');
        $this->addSql('CREATE INDEX IDX_ticket_attachment_uploaded_by ON ticket_attachment (uploaded_by_id)');

        // ── FK ─────────────────────────────────────────────────────
        $this->addSql('ALTER TABLE ticket ADD CONSTRAINT FK_ticket_created_by FOREIGN KEY (created_by_id) REFERENCES "user" (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE ticket ADD CONSTRAINT FK_ticket_assigned_to FOREIGN KEY (assigned_to_id) REFERENCES "user" (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE ticket_comment ADD CONSTRAINT FK_ticket_comment_ticket FOREIGN KEY (ticket_id) REFERENCES ticket (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE ticket_comment ADD CONSTRAINT FK_ticket_comment_author FOREIGN KEY (author_id) REFERENCES "user" (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE ticket_attachment ADD CONSTRAINT FK_ticket_attachment_ticket FOREIGN KEY (ticket_id) REFERENCES ticket (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE ticket_attachment ADD CONSTRAINT FK_ticket_attachment_comment FOREIGN KEY (comment_id) REFERENCES ticket_comment (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE ticket_attachment ADD CONSTRAINT FK_ticket_attachment_uploaded_by FOREIGN KEY (uploaded_by_id) REFERENCES "user" (id) ON DELETE SET NULL');

        // ── Seed permissions (tickets.*) ──────────────────────────
        $this->addSql(<<<'SQL'
            INSERT INTO permission (module, action, description)
            SELECT v.module, v.action, v.description
            FROM (VALUES
                ('tickets', 'read',    'TODO/Tickety - zobrazit'),
                ('tickets', 'create',  'TODO/Tickety - vytvořit'),
                ('tickets', 'update',  'TODO/Tickety - upravit (status, priorita, assignee)'),
                ('tickets', 'delete',  'TODO/Tickety - smazat'),
                ('tickets', 'comment', 'TODO/Tickety - komentovat')
            ) AS v(module, action, description)
            WHERE NOT EXISTS (
                SELECT 1 FROM permission p WHERE p.module = v.module AND p.action = v.action
            )
        SQL);

        // ── Napojení permissions na role ──────────────────────────
        // ROLE_ADMIN (a varianty) — full set tickets.*
        $this->addSql(<<<'SQL'
            INSERT INTO role_permission (role_id, permission_id)
            SELECT r.id, p.id
            FROM role r
            CROSS JOIN permission p
            WHERE p.module = 'tickets'
              AND r.name IN ('ROLE_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'SUPER_ADMIN')
              AND NOT EXISTS (
                  SELECT 1 FROM role_permission rp
                  WHERE rp.role_id = r.id AND rp.permission_id = p.id
              )
        SQL);

        // ROLE_MANAGER (pokud existuje) — read + create + comment (žádné delete/update)
        $this->addSql(<<<'SQL'
            INSERT INTO role_permission (role_id, permission_id)
            SELECT r.id, p.id
            FROM role r
            CROSS JOIN permission p
            WHERE p.module = 'tickets'
              AND p.action IN ('read', 'create', 'comment')
              AND r.name IN ('ROLE_MANAGER', 'MANAGER')
              AND NOT EXISTS (
                  SELECT 1 FROM role_permission rp
                  WHERE rp.role_id = r.id AND rp.permission_id = p.id
              )
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql("DELETE FROM role_permission WHERE permission_id IN (SELECT id FROM permission WHERE module = 'tickets')");
        $this->addSql("DELETE FROM permission WHERE module = 'tickets'");
        $this->addSql('DROP TABLE ticket_attachment');
        $this->addSql('DROP TABLE ticket_comment');
        $this->addSql('DROP TABLE ticket');
    }
}
