-- Migration: Staffing Formulas
-- Description: Vytvoření tabulky pro výpočetní vzorce personálu
-- Date: 2025-11-03

CREATE TABLE IF NOT EXISTS staffing_formulas (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    ratio INTEGER NOT NULL CHECK (ratio > 0),
    enabled BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pro rychlé vyhledávání aktivních vzorců
CREATE INDEX idx_staffing_formulas_enabled ON staffing_formulas(enabled);

-- Index pro kategorii
CREATE INDEX idx_staffing_formulas_category ON staffing_formulas(category);

-- Trigger pro automatickou aktualizaci updated_at
CREATE OR REPLACE FUNCTION update_staffing_formulas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_staffing_formulas_updated_at
    BEFORE UPDATE ON staffing_formulas
    FOR EACH ROW
    EXECUTE FUNCTION update_staffing_formulas_updated_at();

-- Vložení výchozích výpočetních vzorců
INSERT INTO staffing_formulas (category, ratio, enabled, description) VALUES
    ('cisniciWaiters', 25, true, 'Jeden číšník na 25 hostů'),
    ('kuchariChefs', 50, true, 'Jeden kuchař na 50 hostů'),
    ('pomocneSilyHelpers', 40, true, 'Jeden pomocník na 40 hostů'),
    ('moderatoriHosts', 100, true, 'Jeden moderátor na 100 hostů'),
    ('muzikantiMusicians', 75, false, 'Jeden muzikant na 75 hostů'),
    ('tanecniciDancers', 50, false, 'Jeden tanečník na 50 hostů'),
    ('fotografkyPhotographers', 150, false, 'Jedna fotografka na 150 hostů'),
    ('sperkyJewelry', 200, false, 'Jeden prodejce šperků na 200 hostů');

COMMENT ON TABLE staffing_formulas IS 'Výpočetní vzorce pro automatické určení počtu personálu na základě počtu hostů';
COMMENT ON COLUMN staffing_formulas.category IS 'Kategorie personálu (cisniciWaiters, kuchariChefs, pomocneSilyHelpers, moderatoriHosts, muzikantiMusicians, tanecniciDancers, fotografkyPhotographers, sperkyJewelry)';
COMMENT ON COLUMN staffing_formulas.ratio IS 'Poměr počtu hostů na jednu osobu (např. 25 = 1 osoba na 25 hostů)';
COMMENT ON COLUMN staffing_formulas.enabled IS 'Zda je vzorec aktivní a používá se pro výpočty';
COMMENT ON COLUMN staffing_formulas.description IS 'Popis vzorce';
