-- ==============================================
-- Migrace: Podpora více prostor pro jednu akci
-- ==============================================
-- Umožňuje, aby jedna akce probíhala současně ve více místech

-- Vytvoření tabulky pro vazbu akce a prostor (many-to-many)
CREATE TABLE IF NOT EXISTS event_space (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    space_name VARCHAR(50) NOT NULL CHECK (space_name IN ('roubenka', 'terasa', 'stodolka', 'cely_areal')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, space_name)
);

-- Migrace dat ze starého sloupce venue do nové tabulky event_space
DO $$
DECLARE
    event_rec RECORD;
BEGIN
    -- Zkontrolujeme jestli existuje sloupec venue
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='event' AND column_name='venue'
    ) THEN
        -- Pro každou akci s venue vytvoříme záznam v event_space
        FOR event_rec IN 
            SELECT id, venue 
            FROM event 
            WHERE venue IS NOT NULL
        LOOP
            -- Vložíme prostor do event_space
            -- Pokud venue obsahuje hodnotu, která odpovídá našim enum hodnotám
            IF event_rec.venue IN ('ROUBENKA', 'TERASA', 'STODOLA', 'CELY_AREAL', 'STANK', 'KOVARNA') THEN
                INSERT INTO event_space (event_id, space_name)
                VALUES (
                    event_rec.id,
                    CASE event_rec.venue
                        WHEN 'ROUBENKA' THEN 'roubenka'
                        WHEN 'TERASA' THEN 'terasa'
                        WHEN 'STODOLA' THEN 'stodolka'
                        WHEN 'CELY_AREAL' THEN 'cely_areal'
                        ELSE 'cely_areal'  -- výchozí hodnota pro ostatní
                    END
                )
                ON CONFLICT (event_id, space_name) DO NOTHING;
            ELSE
                -- Pro neznámé hodnoty dáme celý areál
                INSERT INTO event_space (event_id, space_name)
                VALUES (event_rec.id, 'cely_areal')
                ON CONFLICT (event_id, space_name) DO NOTHING;
            END IF;
        END LOOP;

        -- Odstraníme starý sloupec venue
        ALTER TABLE event DROP COLUMN venue;
    END IF;
END $$;

-- Indexy pro výkon
CREATE INDEX IF NOT EXISTS idx_event_space_event ON event_space(event_id);
CREATE INDEX IF NOT EXISTS idx_event_space_name ON event_space(space_name);

-- Komentáře
COMMENT ON TABLE event_space IS 'Vazba mezi akcí a prostory - umožňuje jedné akci probíhat ve více místech současně';
COMMENT ON COLUMN event_space.space_name IS 'Název prostoru: roubenka, terasa, stodolka, cely_areal';
