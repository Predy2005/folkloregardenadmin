-- Migration: Food Pricing Configuration
-- Description: Adds tables for default food pricing and date-specific price overrides
-- Author: Folklore Garden Admin System
-- Date: 2025-10-31

-- Table: food_pricing_default
-- Purpose: Stores default price for food/menu items per person
CREATE TABLE IF NOT EXISTS food_pricing_default (
    id SERIAL PRIMARY KEY,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default record if table is empty
INSERT INTO food_pricing_default (price, updated_at)
SELECT 0.00, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM food_pricing_default LIMIT 1);

-- Table: food_pricing_date_override
-- Purpose: Stores date-specific price overrides for food/menu items (e.g., premium dates, holidays)
CREATE TABLE IF NOT EXISTS food_pricing_date_override (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on date for faster lookups
CREATE INDEX IF NOT EXISTS idx_food_pricing_date_override_date ON food_pricing_date_override(date);

-- Comments for documentation
COMMENT ON TABLE food_pricing_default IS 'Default pricing for food/menu items per person';
COMMENT ON TABLE food_pricing_date_override IS 'Date-specific price overrides for food/menu items (premium dates, holidays, etc.)';
COMMENT ON COLUMN food_pricing_default.price IS 'Default price per person for food/menu in CZK';
COMMENT ON COLUMN food_pricing_date_override.date IS 'Date for which this price override applies (YYYY-MM-DD)';
COMMENT ON COLUMN food_pricing_date_override.price IS 'Override price per person for food/menu in CZK';
COMMENT ON COLUMN food_pricing_date_override.reason IS 'Optional reason for price override (e.g., Premium datum, Vánoce)';
