<?php

declare(strict_types=1);

/**
 * ticket / ticket_comment / ticket_attachment + permissions
 * — mirror Version20260429120611.
 *
 * Vytváří modul TODO/Tickety, seeduje 5 permissions a napojuje je na role.
 * IDEMPOTENTNÍ.
 */

return function (ProductionMigrationRunner $runner) {
    $runner->migrate(
        'DoctrineMigrations\\Version20260429120611',
        'Ticket module + permissions seed',
        function (PDO $db, ProductionMigrationRunner $r) {
            // ── Tabulky (CREATE IF NOT EXISTS) ─────────────────────
            $db->exec(<<<'SQL'
                CREATE TABLE IF NOT EXISTS ticket (
                    id SERIAL PRIMARY KEY,
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
                    occurrence_count INT NOT NULL DEFAULT 1,
                    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                    updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                    resolved_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                    last_occurrence_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL
                )
            SQL);
            $db->exec('CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_ticket_error_hash ON ticket (error_hash)');
            $db->exec('CREATE INDEX IF NOT EXISTS IDX_ticket_created_by ON ticket (created_by_id)');
            $db->exec('CREATE INDEX IF NOT EXISTS IDX_ticket_assigned_to ON ticket (assigned_to_id)');

            $db->exec(<<<'SQL'
                CREATE TABLE IF NOT EXISTS ticket_comment (
                    id SERIAL PRIMARY KEY,
                    ticket_id INT NOT NULL,
                    author_id INT DEFAULT NULL,
                    content TEXT NOT NULL,
                    is_internal BOOLEAN NOT NULL DEFAULT false,
                    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
                )
            SQL);
            $db->exec('CREATE INDEX IF NOT EXISTS IDX_ticket_comment_ticket ON ticket_comment (ticket_id)');
            $db->exec('CREATE INDEX IF NOT EXISTS IDX_ticket_comment_author ON ticket_comment (author_id)');

            $db->exec(<<<'SQL'
                CREATE TABLE IF NOT EXISTS ticket_attachment (
                    id SERIAL PRIMARY KEY,
                    ticket_id INT NOT NULL,
                    comment_id INT DEFAULT NULL,
                    uploaded_by_id INT DEFAULT NULL,
                    filename VARCHAR(255) NOT NULL,
                    mime_type VARCHAR(100) NOT NULL,
                    size_bytes INT NOT NULL,
                    storage_path VARCHAR(500) NOT NULL,
                    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
                )
            SQL);
            $db->exec('CREATE INDEX IF NOT EXISTS IDX_ticket_attachment_ticket ON ticket_attachment (ticket_id)');
            $db->exec('CREATE INDEX IF NOT EXISTS IDX_ticket_attachment_comment ON ticket_attachment (comment_id)');
            $db->exec('CREATE INDEX IF NOT EXISTS IDX_ticket_attachment_uploaded_by ON ticket_attachment (uploaded_by_id)');
            $r->log('  • ticket / ticket_comment / ticket_attachment tables OK');

            // ── FK (přidáme jen pokud chybí) ───────────────────────
            $db->exec(<<<'SQL'
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                                    WHERE table_name = 'ticket' AND constraint_name = 'FK_ticket_created_by') THEN
                        ALTER TABLE ticket ADD CONSTRAINT FK_ticket_created_by
                            FOREIGN KEY (created_by_id) REFERENCES "user" (id) ON DELETE SET NULL;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                                    WHERE table_name = 'ticket' AND constraint_name = 'FK_ticket_assigned_to') THEN
                        ALTER TABLE ticket ADD CONSTRAINT FK_ticket_assigned_to
                            FOREIGN KEY (assigned_to_id) REFERENCES "user" (id) ON DELETE SET NULL;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                                    WHERE table_name = 'ticket_comment' AND constraint_name = 'FK_ticket_comment_ticket') THEN
                        ALTER TABLE ticket_comment ADD CONSTRAINT FK_ticket_comment_ticket
                            FOREIGN KEY (ticket_id) REFERENCES ticket (id) ON DELETE CASCADE;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                                    WHERE table_name = 'ticket_comment' AND constraint_name = 'FK_ticket_comment_author') THEN
                        ALTER TABLE ticket_comment ADD CONSTRAINT FK_ticket_comment_author
                            FOREIGN KEY (author_id) REFERENCES "user" (id) ON DELETE SET NULL;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                                    WHERE table_name = 'ticket_attachment' AND constraint_name = 'FK_ticket_attachment_ticket') THEN
                        ALTER TABLE ticket_attachment ADD CONSTRAINT FK_ticket_attachment_ticket
                            FOREIGN KEY (ticket_id) REFERENCES ticket (id) ON DELETE CASCADE;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                                    WHERE table_name = 'ticket_attachment' AND constraint_name = 'FK_ticket_attachment_comment') THEN
                        ALTER TABLE ticket_attachment ADD CONSTRAINT FK_ticket_attachment_comment
                            FOREIGN KEY (comment_id) REFERENCES ticket_comment (id) ON DELETE CASCADE;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                                    WHERE table_name = 'ticket_attachment' AND constraint_name = 'FK_ticket_attachment_uploaded_by') THEN
                        ALTER TABLE ticket_attachment ADD CONSTRAINT FK_ticket_attachment_uploaded_by
                            FOREIGN KEY (uploaded_by_id) REFERENCES "user" (id) ON DELETE SET NULL;
                    END IF;
                END $$;
            SQL);
            $r->log('  • Foreign keys OK');

            // ── Permissions seed ───────────────────────────────────
            $perms = [
                ['tickets', 'read',    'TODO/Tickety - zobrazit'],
                ['tickets', 'create',  'TODO/Tickety - vytvořit'],
                ['tickets', 'update',  'TODO/Tickety - upravit (status, priorita, assignee)'],
                ['tickets', 'delete',  'TODO/Tickety - smazat'],
                ['tickets', 'comment', 'TODO/Tickety - komentovat'],
            ];
            $insertPerm = $db->prepare(
                'INSERT INTO permission (module, action, description)
                 SELECT CAST(:m AS VARCHAR), CAST(:a AS VARCHAR), CAST(:d AS VARCHAR)
                 WHERE NOT EXISTS (SELECT 1 FROM permission WHERE module = :m AND action = :a)'
            );
            foreach ($perms as [$m, $a, $d]) {
                $insertPerm->execute(['m' => $m, 'a' => $a, 'd' => $d]);
            }
            $r->log('  • 5 tickets permissions seed OK');

            // ── ADMIN/SUPER_ADMIN — full set ───────────────────────
            $db->exec(<<<'SQL'
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

            // ── MANAGER — read/create/comment (pokud role existuje) ─
            $db->exec(<<<'SQL'
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
            $r->log('  • role_permission vazby (ADMIN/SUPER_ADMIN/MANAGER) OK');
        }
    );
};
