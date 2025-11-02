-- Migration: Per-Item Food Pricing and Availability
-- Description: Adds per-item pricing overrides and availability control for individual menu items
-- Author: Folklore Garden Admin System
-- Date: 2025-11-02
-- Replaces: Global food pricing system (sql/07_food_pricing.sql)

-- ============================================================
-- CLEANUP: Remove old global food pricing tables (if they exist)
-- ============================================================

-- Drop old global food pricing tables (no longer used)
DROP TABLE IF EXISTS food_pricing_date_override CASCADE;
DROP TABLE IF EXISTS food_pricing_default CASCADE;

-- ============================================================
-- TABLE: food_item_price_override
-- Purpose: Per-item date-specific price overrides for individual menu items
-- ============================================================

CREATE TABLE IF NOT EXISTS food_item_price_override (
    id SERIAL PRIMARY KEY,
    reservation_food_id INT NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE,
    price DECIMAL(10,2) NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_food_item_price_override_food
        FOREIGN KEY (reservation_food_id) 
        REFERENCES reservation_food(id) 
        ON DELETE CASCADE,
    
    -- Validation: date_to must be >= date_from
    CONSTRAINT chk_food_price_override_date_range
        CHECK (date_to IS NULL OR date_to >= date_from),
    
    -- Validation: price must be non-negative
    CONSTRAINT chk_food_price_override_price
        CHECK (price >= 0)
);

-- ============================================================
-- TABLE: food_item_availability
-- Purpose: Per-item date-specific availability control (show/hide items on specific dates)
-- ============================================================

CREATE TABLE IF NOT EXISTS food_item_availability (
    id SERIAL PRIMARY KEY,
    reservation_food_id INT NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE,
    available BOOLEAN NOT NULL DEFAULT true,
    reason VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_food_item_availability_food
        FOREIGN KEY (reservation_food_id) 
        REFERENCES reservation_food(id) 
        ON DELETE CASCADE,
    
    -- Validation: date_to must be >= date_from
    CONSTRAINT chk_food_availability_date_range
        CHECK (date_to IS NULL OR date_to >= date_from)
);

-- ============================================================
-- INDEXES: For faster lookups and queries
-- ============================================================

-- Index for finding all price overrides for a specific food item
CREATE INDEX IF NOT EXISTS idx_food_price_override_food_id 
    ON food_item_price_override(reservation_food_id);

-- Index for finding price overrides within date ranges
CREATE INDEX IF NOT EXISTS idx_food_price_override_dates 
    ON food_item_price_override(date_from, date_to);

-- Composite index for common query pattern: food + date range
CREATE INDEX IF NOT EXISTS idx_food_price_override_food_dates 
    ON food_item_price_override(reservation_food_id, date_from, date_to);

-- Index for finding all availability rules for a specific food item
CREATE INDEX IF NOT EXISTS idx_food_availability_food_id 
    ON food_item_availability(reservation_food_id);

-- Index for finding availability rules within date ranges
CREATE INDEX IF NOT EXISTS idx_food_availability_dates 
    ON food_item_availability(date_from, date_to);

-- Composite index for common query pattern: food + date range
CREATE INDEX IF NOT EXISTS idx_food_availability_food_dates 
    ON food_item_availability(reservation_food_id, date_from, date_to);

-- ============================================================
-- COMMENTS: Documentation for database schema
-- ============================================================

COMMENT ON TABLE food_item_price_override IS 
    'Per-item date-specific price overrides for individual menu items. Allows setting special prices (e.g., free, premium) for specific dates or date ranges.';

COMMENT ON TABLE food_item_availability IS 
    'Per-item date-specific availability control. Allows hiding/showing menu items for specific dates or date ranges (e.g., seasonal items, unavailable on certain days).';

COMMENT ON COLUMN food_item_price_override.reservation_food_id IS 
    'Foreign key to reservation_food table - which menu item this override applies to';

COMMENT ON COLUMN food_item_price_override.date_from IS 
    'Start date for this price override (YYYY-MM-DD). Override applies from this date.';

COMMENT ON COLUMN food_item_price_override.date_to IS 
    'Optional end date for this price override (YYYY-MM-DD). If NULL, override applies only to date_from. If set, override applies to entire date range.';

COMMENT ON COLUMN food_item_price_override.price IS 
    'Override price for this menu item in CZK. Can be 0.00 for free items, or higher than default price for premium dates.';

COMMENT ON COLUMN food_item_price_override.reason IS 
    'Optional reason for this price override (e.g., "Vánoce - Premium datum", "Akce - zdarma")';

COMMENT ON COLUMN food_item_availability.reservation_food_id IS 
    'Foreign key to reservation_food table - which menu item this availability rule applies to';

COMMENT ON COLUMN food_item_availability.date_from IS 
    'Start date for this availability rule (YYYY-MM-DD). Rule applies from this date.';

COMMENT ON COLUMN food_item_availability.date_to IS 
    'Optional end date for this availability rule (YYYY-MM-DD). If NULL, rule applies only to date_from. If set, rule applies to entire date range.';

COMMENT ON COLUMN food_item_availability.available IS 
    'Whether menu item is available (true) or hidden (false) during this date range';

COMMENT ON COLUMN food_item_availability.reason IS 
    'Optional reason for this availability rule (e.g., "Není k dispozici v pátek", "Sezónní položka - pouze léto")';

-- ============================================================
-- USAGE EXAMPLES
-- ============================================================

-- Example 1: Make a menu item free on Christmas Day
-- INSERT INTO food_item_price_override (reservation_food_id, date_from, price, reason)
-- VALUES (5, '2025-12-25', 0.00, 'Vánoce - zdarma');

-- Example 2: Premium pricing for New Year's Eve through New Year
-- INSERT INTO food_item_price_override (reservation_food_id, date_from, date_to, price, reason)
-- VALUES (5, '2025-12-31', '2026-01-01', 850.00, 'Silvestr - Premium cena');

-- Example 3: Hide a menu item on Fridays (single date example)
-- INSERT INTO food_item_availability (reservation_food_id, date_from, available, reason)
-- VALUES (7, '2025-11-23', false, 'Není k dispozici v pátek');

-- Example 4: Seasonal item only available during summer
-- INSERT INTO food_item_availability (reservation_food_id, date_from, date_to, available, reason)
-- VALUES (8, '2025-06-01', '2025-08-31', true, 'Letní sezónní položka');
