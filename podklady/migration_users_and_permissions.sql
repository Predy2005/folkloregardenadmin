-- ============================================================================
-- PRODUCTION: Users, Roles, Permissions seed
-- Run against: folkloregardenadmin (production PostgreSQL)
-- Date: 2026-03-27
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. PERMISSIONS (82 entries)
-- ============================================================================

TRUNCATE permission CASCADE;

INSERT INTO permission (id, module, action, description) VALUES
(1, 'dashboard', 'read', 'Dashboard a statistiky - Zobrazení'),
(2, 'reservations', 'read', 'Rezervace - Zobrazení'),
(3, 'reservations', 'create', 'Rezervace - Vytvoření'),
(4, 'reservations', 'update', 'Rezervace - Úprava'),
(5, 'reservations', 'delete', 'Rezervace - Smazání'),
(6, 'reservations', 'send_email', 'Rezervace - Odeslání emailu'),
(7, 'payments', 'read', 'Platby - Zobrazení'),
(8, 'payments', 'export', 'Platby - Export'),
(9, 'contacts', 'read', 'Kontakty - Zobrazení'),
(10, 'contacts', 'create', 'Kontakty - Vytvoření'),
(11, 'contacts', 'update', 'Kontakty - Úprava'),
(12, 'contacts', 'delete', 'Kontakty - Smazání'),
(13, 'foods', 'read', 'Jídla a menu - Zobrazení'),
(14, 'foods', 'create', 'Jídla a menu - Vytvoření'),
(15, 'foods', 'update', 'Jídla a menu - Úprava'),
(16, 'foods', 'delete', 'Jídla a menu - Smazání'),
(17, 'food_pricing', 'read', 'Cenové přepisy jídel - Zobrazení'),
(18, 'food_pricing', 'create', 'Cenové přepisy jídel - Vytvoření'),
(19, 'food_pricing', 'update', 'Cenové přepisy jídel - Úprava'),
(20, 'food_pricing', 'delete', 'Cenové přepisy jídel - Smazání'),
(21, 'food_availability', 'read', 'Dostupnost jídel - Zobrazení'),
(22, 'food_availability', 'create', 'Dostupnost jídel - Vytvoření'),
(23, 'food_availability', 'update', 'Dostupnost jídel - Úprava'),
(24, 'food_availability', 'delete', 'Dostupnost jídel - Smazání'),
(25, 'pricing', 'read', 'Cenník - Zobrazení'),
(26, 'pricing', 'update', 'Cenník - Úprava'),
(27, 'events', 'read', 'Akce a eventy - Zobrazení'),
(28, 'events', 'create', 'Akce a eventy - Vytvoření'),
(29, 'events', 'update', 'Akce a eventy - Úprava'),
(30, 'events', 'delete', 'Akce a eventy - Smazání'),
(31, 'users', 'read', 'Uživatelé systému - Zobrazení'),
(32, 'users', 'create', 'Uživatelé systému - Vytvoření'),
(33, 'users', 'update', 'Uživatelé systému - Úprava'),
(34, 'users', 'delete', 'Uživatelé systému - Smazání'),
(35, 'permissions', 'read', 'Oprávnění a role - Zobrazení'),
(36, 'permissions', 'update', 'Oprávnění a role - Úprava'),
(37, 'staff', 'read', 'Personál - Zobrazení'),
(38, 'staff', 'create', 'Personál - Vytvoření'),
(39, 'staff', 'update', 'Personál - Úprava'),
(40, 'staff', 'delete', 'Personál - Smazání'),
(41, 'staff_attendance', 'read', 'Docházka personálu - Zobrazení'),
(42, 'staff_attendance', 'create', 'Docházka personálu - Vytvoření'),
(43, 'staff_attendance', 'update', 'Docházka personálu - Úprava'),
(44, 'staffing_formulas', 'read', 'Staffing vzorce - Zobrazení'),
(45, 'staffing_formulas', 'create', 'Staffing vzorce - Vytvoření'),
(46, 'staffing_formulas', 'update', 'Staffing vzorce - Úprava'),
(47, 'staffing_formulas', 'delete', 'Staffing vzorce - Smazání'),
(48, 'stock_items', 'read', 'Skladové položky - Zobrazení'),
(49, 'stock_items', 'create', 'Skladové položky - Vytvoření'),
(50, 'stock_items', 'update', 'Skladové položky - Úprava'),
(51, 'stock_items', 'delete', 'Skladové položky - Smazání'),
(52, 'recipes', 'read', 'Receptury - Zobrazení'),
(53, 'recipes', 'create', 'Receptury - Vytvoření'),
(54, 'recipes', 'update', 'Receptury - Úprava'),
(55, 'recipes', 'delete', 'Receptury - Smazání'),
(56, 'stock_movements', 'read', 'Pohyby skladu - Zobrazení'),
(57, 'stock_movements', 'create', 'Pohyby skladu - Vytvoření'),
(58, 'partners', 'read', 'Partneři - Zobrazení'),
(59, 'partners', 'create', 'Partneři - Vytvoření'),
(60, 'partners', 'update', 'Partneři - Úprava'),
(61, 'partners', 'delete', 'Partneři - Smazání'),
(62, 'vouchers', 'read', 'Vouchery - Zobrazení'),
(63, 'vouchers', 'create', 'Vouchery - Vytvoření'),
(64, 'vouchers', 'update', 'Vouchery - Úprava'),
(65, 'vouchers', 'delete', 'Vouchery - Smazání'),
(66, 'vouchers', 'redeem', 'Vouchery - Uplatnění'),
(67, 'commissions', 'read', 'Provize - Zobrazení'),
(68, 'commissions', 'export', 'Provize - Export'),
(69, 'cashbox', 'read', 'Pokladna - Zobrazení'),
(70, 'cashbox', 'create', 'Pokladna - Vytvoření'),
(71, 'cashbox', 'close', 'Pokladna - Uzavření'),
(72, 'disabled_dates', 'read', 'Blokované termíny - Zobrazení'),
(73, 'disabled_dates', 'create', 'Blokované termíny - Vytvoření'),
(74, 'disabled_dates', 'update', 'Blokované termíny - Úprava'),
(75, 'disabled_dates', 'delete', 'Blokované termíny - Smazání'),
(76, 'reservation_types', 'read', 'Druhy rezervací - Zobrazení'),
(77, 'reservation_types', 'create', 'Druhy rezervací - Vytvoření'),
(78, 'reservation_types', 'update', 'Druhy rezervací - Úprava'),
(79, 'reservation_types', 'delete', 'Druhy rezervací - Smazání'),
(80, 'cashbox', 'update', 'Pokladna - Úprava'),
(81, 'cashbox', 'delete', 'Pokladna - Smazání'),
(82, 'cashbox', 'reopen', 'Pokladna - Reopen');

SELECT setval('permission_id_seq', 82);

-- ============================================================================
-- 2. ROLES (8 entries)
-- ============================================================================

TRUNCATE role CASCADE;

INSERT INTO role (id, name, description, created_at, updated_at) VALUES
(1, 'SUPER_ADMIN', 'Plná kontrola nad systémem včetně správy oprávnění', NOW(), NOW()),
(2, 'ADMIN', 'Plný přístup ke všem modulům (bez správy oprávnění)', NOW(), NOW()),
(3, 'MANAGER', 'Rezervace, Eventy, Personál, Pokladna, Reporty', NOW(), NOW()),
(4, 'STAFF_MANAGER', 'Personál, Docházka, Staffing', NOW(), NOW()),
(5, 'ACCOUNTANT', 'Platby, Pokladna, Provize, Vouchery', NOW(), NOW()),
(6, 'RECEPTIONIST', 'Rezervace (CRUD), Kontakty, Eventy (read)', NOW(), NOW()),
(7, 'WAREHOUSE', 'Sklad, Receptury', NOW(), NOW()),
(8, 'VIEWER', 'Read-only přístup k povoleným modulům', NOW(), NOW());

SELECT setval('role_id_seq', 8);

-- ============================================================================
-- 3. ROLE_PERMISSION mappings
-- ============================================================================

TRUNCATE role_permission;

-- SUPER_ADMIN (role 1) — all 82 permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT 1, id FROM permission;

-- ADMIN (role 2) — all except permissions.read (35) and permissions.update (36)
INSERT INTO role_permission (role_id, permission_id)
SELECT 2, id FROM permission WHERE id NOT IN (35, 36);

-- MANAGER (role 3)
INSERT INTO role_permission (role_id, permission_id) VALUES
(3,1),(3,2),(3,3),(3,4),(3,5),(3,6),(3,7),(3,8),(3,9),(3,10),(3,11),(3,12),
(3,13),(3,17),(3,21),(3,25),(3,27),(3,28),(3,29),(3,30),
(3,37),(3,38),(3,39),(3,40),(3,41),(3,42),(3,43),(3,44),(3,45),(3,46),(3,47),
(3,48),(3,52),(3,56),
(3,58),(3,59),(3,60),(3,61),(3,62),(3,63),(3,64),(3,65),(3,66),(3,67),(3,68),
(3,69),(3,70),(3,71),(3,72),(3,73),(3,74),(3,75),(3,76),(3,77),(3,78),(3,79),
(3,80),(3,81),(3,82);

-- STAFF_MANAGER (role 4)
INSERT INTO role_permission (role_id, permission_id) VALUES
(4,1),(4,37),(4,38),(4,39),(4,40),(4,41),(4,42),(4,43),(4,44),(4,45),(4,46),(4,47);

-- ACCOUNTANT (role 5)
INSERT INTO role_permission (role_id, permission_id) VALUES
(5,1),(5,2),(5,7),(5,8),(5,9),(5,25),(5,27),
(5,58),(5,59),(5,60),(5,61),(5,62),(5,63),(5,64),(5,65),(5,66),(5,67),(5,68),
(5,69),(5,70),(5,71),(5,80),(5,81),(5,82);

-- RECEPTIONIST (role 6)
INSERT INTO role_permission (role_id, permission_id) VALUES
(6,1),(6,2),(6,3),(6,4),(6,6),(6,7),(6,9),(6,10),(6,11),(6,12),
(6,13),(6,17),(6,21),(6,25),(6,27),(6,62),(6,72),(6,76);

-- WAREHOUSE (role 7)
INSERT INTO role_permission (role_id, permission_id) VALUES
(7,48),(7,49),(7,50),(7,51),(7,52),(7,53),(7,54),(7,55),(7,56),(7,57);

-- VIEWER (role 8)
INSERT INTO role_permission (role_id, permission_id) VALUES
(8,1),(8,2),(8,27);

-- ============================================================================
-- 4. USERS
-- ============================================================================

DELETE FROM user_role WHERE user_id IN (1, 2, 12);
DELETE FROM "user" WHERE id IN (1, 2, 12);

INSERT INTO "user" (id, username, email, password, roles, created_at, updated_at) VALUES
(1, 'admin@folkloregarden.cz', 'admin@folkloregarden.cz', '$2y$13$IK6gzps/XAXbKTVel5uOqOLuXAYPcBem5oquEXaapCoTn1ppHiqg2', '["ROLE_ADMIN"]', NOW(), NOW()),
(2, 'info@servispc-liberec.cz', 'info@servispc-liberec.cz', '$2y$13$7DX2sJiLTLSmkBHQ3g8iLeg2zicFzc5cEG9O3XuRDjYiW9rCzjAzC', '["ROLE_USER"]', NOW(), NOW()),
(12, 'test@example.com', 'test@example.com', '$2y$13$OB5rmBYG1HhCha4v05AFwOKxED2fwJTYNYpT3OmjmP1uiVZSvUbsC', '[]', NOW(), NOW());

SELECT setval('user_id_seq', (SELECT MAX(id) FROM "user"));

-- ============================================================================
-- 5. USER_ROLE assignments
-- ============================================================================

-- admin@folkloregarden.cz => ADMIN (role 2)
INSERT INTO user_role (user_id, role_id, assigned_at) VALUES (1, 2, NOW());

-- info@servispc-liberec.cz => SUPER_ADMIN (role 1)
INSERT INTO user_role (user_id, role_id, assigned_at) VALUES (2, 1, NOW());

-- test@example.com => STAFF_MANAGER (role 4)
INSERT INTO user_role (user_id, role_id, assigned_at) VALUES (12, 4, NOW());

COMMIT;
