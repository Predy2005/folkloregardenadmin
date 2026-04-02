-- ============================================================================
-- PRODUCTION MIGRATION SCRIPT
-- Folklore Garden Admin - Floor Plan System
-- Run against: folkloregardenadmin (production PostgreSQL)
-- Date: 2026-03-27
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. NEW TABLES: building, room, floor_plan_element, floor_plan_template, table_expense
-- ============================================================================

-- Building
CREATE TABLE building (
    id SERIAL NOT NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    description TEXT DEFAULT NULL,
    sort_order INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY(id)
);
CREATE UNIQUE INDEX uniq_building_slug ON building (slug);

-- Room
CREATE TABLE room (
    id SERIAL NOT NULL,
    building_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    width_cm INT DEFAULT 1000 NOT NULL,
    height_cm INT DEFAULT 800 NOT NULL,
    capacity_limit INT DEFAULT NULL,
    shape_data JSON DEFAULT NULL,
    color VARCHAR(7) DEFAULT NULL,
    sort_order INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY(id)
);
CREATE INDEX idx_room_building ON room (building_id);
ALTER TABLE room ADD CONSTRAINT fk_room_building
    FOREIGN KEY (building_id) REFERENCES building (id) ON DELETE CASCADE;

-- Floor Plan Element
CREATE TABLE floor_plan_element (
    id SERIAL NOT NULL,
    event_id INT NOT NULL,
    room_id INT DEFAULT NULL,
    element_type VARCHAR(30) NOT NULL,
    label VARCHAR(100) DEFAULT NULL,
    position_x DOUBLE PRECISION DEFAULT 0 NOT NULL,
    position_y DOUBLE PRECISION DEFAULT 0 NOT NULL,
    width_px DOUBLE PRECISION DEFAULT 100 NOT NULL,
    height_px DOUBLE PRECISION DEFAULT 100 NOT NULL,
    rotation DOUBLE PRECISION DEFAULT 0 NOT NULL,
    shape VARCHAR(20) DEFAULT 'rectangle' NOT NULL,
    shape_data JSON DEFAULT NULL,
    color VARCHAR(7) DEFAULT NULL,
    is_locked BOOLEAN DEFAULT false NOT NULL,
    sort_order INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY(id)
);
CREATE INDEX idx_floor_plan_element_event ON floor_plan_element (event_id);
CREATE INDEX idx_floor_plan_element_room ON floor_plan_element (room_id);
ALTER TABLE floor_plan_element ADD CONSTRAINT fk_floor_plan_element_event
    FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE;
ALTER TABLE floor_plan_element ADD CONSTRAINT fk_floor_plan_element_room
    FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE SET NULL;

-- Floor Plan Template
CREATE TABLE floor_plan_template (
    id SERIAL NOT NULL,
    room_id INT DEFAULT NULL,
    created_by INT DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    layout_data JSON NOT NULL,
    is_default BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY(id)
);
CREATE INDEX idx_floor_plan_template_room ON floor_plan_template (room_id);
CREATE INDEX idx_floor_plan_template_created_by ON floor_plan_template (created_by);
ALTER TABLE floor_plan_template ADD CONSTRAINT fk_floor_plan_template_room
    FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE SET NULL;
ALTER TABLE floor_plan_template ADD CONSTRAINT fk_floor_plan_template_user
    FOREIGN KEY (created_by) REFERENCES "user" (id) ON DELETE SET NULL;

-- Table Expense (POS)
CREATE TABLE table_expense (
    id SERIAL NOT NULL,
    event_table_id INT NOT NULL,
    event_id INT NOT NULL,
    created_by INT DEFAULT NULL,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT 'other' NOT NULL,
    quantity INT DEFAULT 1 NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CZK' NOT NULL,
    is_paid BOOLEAN DEFAULT false NOT NULL,
    paid_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY(id)
);
CREATE INDEX idx_table_expense_table ON table_expense (event_table_id);
CREATE INDEX idx_table_expense_event ON table_expense (event_id);
CREATE INDEX idx_table_expense_created_by ON table_expense (created_by);
ALTER TABLE table_expense ADD CONSTRAINT fk_table_expense_table
    FOREIGN KEY (event_table_id) REFERENCES event_table (id) ON DELETE CASCADE;
ALTER TABLE table_expense ADD CONSTRAINT fk_table_expense_event
    FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE;
ALTER TABLE table_expense ADD CONSTRAINT fk_table_expense_user
    FOREIGN KEY (created_by) REFERENCES "user" (id) ON DELETE SET NULL;

-- ============================================================================
-- 2. ALTER event_table: new columns + type changes
-- ============================================================================

-- New columns
ALTER TABLE event_table ADD COLUMN room_id INT DEFAULT NULL;
ALTER TABLE event_table ADD COLUMN shape VARCHAR(20) DEFAULT 'round' NOT NULL;
ALTER TABLE event_table ADD COLUMN width_px DOUBLE PRECISION DEFAULT NULL;
ALTER TABLE event_table ADD COLUMN height_px DOUBLE PRECISION DEFAULT NULL;
ALTER TABLE event_table ADD COLUMN rotation DOUBLE PRECISION DEFAULT 0 NOT NULL;
ALTER TABLE event_table ADD COLUMN table_number INT DEFAULT NULL;
ALTER TABLE event_table ADD COLUMN color VARCHAR(7) DEFAULT NULL;
ALTER TABLE event_table ADD COLUMN is_locked BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE event_table ADD COLUMN sort_order INT DEFAULT 0 NOT NULL;

-- Change position columns from INT to DOUBLE PRECISION
ALTER TABLE event_table ALTER COLUMN position_x TYPE DOUBLE PRECISION;
ALTER TABLE event_table ALTER COLUMN position_y TYPE DOUBLE PRECISION;

-- FK to room
CREATE INDEX idx_event_table_room ON event_table (room_id);
ALTER TABLE event_table ADD CONSTRAINT fk_event_table_room
    FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE SET NULL;

-- ============================================================================
-- 3. ALTER event_guest: add room_id
-- ============================================================================

ALTER TABLE event_guest ADD COLUMN room_id INT DEFAULT NULL;
CREATE INDEX idx_event_guest_room ON event_guest (room_id);
ALTER TABLE event_guest ADD CONSTRAINT fk_event_guest_room
    FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE SET NULL;

-- ============================================================================
-- 4. ALTER event_space: add room_id
-- ============================================================================

ALTER TABLE event_space ADD COLUMN room_id INT DEFAULT NULL;
CREATE INDEX idx_event_space_room ON event_space (room_id);
ALTER TABLE event_space ADD CONSTRAINT fk_event_space_room
    FOREIGN KEY (room_id) REFERENCES room (id) ON DELETE SET NULL;

-- ============================================================================
-- 5. Record migrations as executed (so Doctrine won't try to re-run them)
-- ============================================================================

INSERT INTO doctrine_migration_versions (version, executed_at, execution_time) VALUES
    ('DoctrineMigrations\Version20260325131904', NOW(), 0),
    ('DoctrineMigrations\Version20260325133728', NOW(), 0),
    ('DoctrineMigrations\Version20260325133741', NOW(), 0),
    ('DoctrineMigrations\Version20260327090503', NOW(), 0);

COMMIT;
