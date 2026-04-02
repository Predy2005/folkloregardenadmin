-- ============================================================================
-- PRODUCTION: Insert users (same credentials as local dev)
-- Run against: folkloregardenadmin (production PostgreSQL)
-- ============================================================================

BEGIN;

-- Delete existing users if any (to avoid conflicts)
DELETE FROM "user" WHERE username IN ('admin@folkloregarden.cz', 'info@servispc-liberec.cz', 'test@example.com');

-- Insert users with same password hashes as local
INSERT INTO "user" (id, username, email, password, roles, created_at, updated_at) VALUES
(1, 'admin@folkloregarden.cz', 'admin@folkloregarden.cz', '$2y$13$IK6gzps/XAXbKTVel5uOqOLuXAYPcBem5oquEXaapCoTn1ppHiqg2', '["ROLE_ADMIN"]', NOW(), NOW()),
(2, 'info@servispc-liberec.cz', 'info@servispc-liberec.cz', '$2y$13$7DX2sJiLTLSmkBHQ3g8iLeg2zicFzc5cEG9O3XuRDjYiW9rCzjAzC', '["ROLE_USER"]', NOW(), NOW()),
(12, 'test@example.com', 'test@example.com', '$2y$13$OB5rmBYG1HhCha4v05AFwOKxED2fwJTYNYpT3OmjmP1uiVZSvUbsC', '[]', NOW(), NOW());

-- Reset sequence to next available ID
SELECT setval('user_id_seq', (SELECT MAX(id) FROM "user"));

COMMIT;
