-- ==============================================
-- Migrace: event_table - Správa stolů pro akce
-- ==============================================
-- Rozšíření modulu Event o správu stolů s floor planem
-- Vytvoří tabulku event_table a upraví event_guest

-- Vytvoření tabulky event_table
CREATE TABLE IF NOT EXISTS event_table (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    table_name VARCHAR(100) NOT NULL,
    room VARCHAR(50) NOT NULL CHECK (room IN ('roubenka', 'terasa', 'stodolka', 'cely_areal')),
    capacity INT NOT NULL DEFAULT 4 CHECK (capacity > 0),
    position_x INT,
    position_y INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Migrace event_guest - přidání event_table_id
-- Nejdřív zkontrolujeme, jestli sloupce existují
DO $$ 
BEGIN
    -- Přidat event_table_id pokud neexistuje
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='event_guest' AND column_name='event_table_id'
    ) THEN
        ALTER TABLE event_guest ADD COLUMN event_table_id INT REFERENCES event_table(id) ON DELETE SET NULL;
    END IF;

    -- Přidat reservation_id pokud neexistuje
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='event_guest' AND column_name='reservation_id'
    ) THEN
        ALTER TABLE event_guest ADD COLUMN reservation_id INT REFERENCES reservation(id) ON DELETE SET NULL;
    END IF;

    -- Přidat person_index pokud neexistuje
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='event_guest' AND column_name='person_index'
    ) THEN
        ALTER TABLE event_guest ADD COLUMN person_index INT;
    END IF;

    -- Přidat type pokud neexistuje
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='event_guest' AND column_name='type'
    ) THEN
        ALTER TABLE event_guest ADD COLUMN type VARCHAR(20) DEFAULT 'adult' CHECK (type IN ('adult', 'child'));
    END IF;

    -- Přidat is_present pokud neexistuje
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='event_guest' AND column_name='is_present'
    ) THEN
        ALTER TABLE event_guest ADD COLUMN is_present BOOLEAN DEFAULT false;
    END IF;

    -- Přidat menu_item_id pokud neexistuje
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='event_guest' AND column_name='menu_item_id'
    ) THEN
        ALTER TABLE event_guest ADD COLUMN menu_item_id INT REFERENCES event_menu(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Migrace starých dat (table_number -> event_table_id)
-- Pokud existují záznamy s table_number, vytvoříme pro ně event_table záznamy
DO $$
DECLARE
    guest_rec RECORD;
    new_table_id INT;
BEGIN
    -- Zkontrolujeme jestli existuje sloupec table_number
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='event_guest' AND column_name='table_number'
    ) THEN
        -- Pro každý unikátní event_id a table_number vytvoříme event_table
        FOR guest_rec IN 
            SELECT DISTINCT event_id, table_number 
            FROM event_guest 
            WHERE table_number IS NOT NULL
        LOOP
            -- Vytvoříme event_table
            INSERT INTO event_table (event_id, table_name, room, capacity)
            VALUES (
                guest_rec.event_id,
                'Stůl ' || guest_rec.table_number,
                'cely_areal', -- výchozí místnost
                10 -- výchozí kapacita
            )
            RETURNING id INTO new_table_id;

            -- Aktualizujeme všechny hosty s tímto table_number
            UPDATE event_guest 
            SET event_table_id = new_table_id
            WHERE event_id = guest_rec.event_id 
              AND table_number = guest_rec.table_number;
        END LOOP;

        -- Odstraníme starý sloupec table_number
        ALTER TABLE event_guest DROP COLUMN IF EXISTS table_number;
        ALTER TABLE event_guest DROP COLUMN IF EXISTS seat_number;
    END IF;
END $$;

-- Indexy pro výkon
CREATE INDEX IF NOT EXISTS idx_event_table_event ON event_table(event_id);
CREATE INDEX IF NOT EXISTS idx_event_table_room ON event_table(room);
CREATE INDEX IF NOT EXISTS idx_event_guest_table ON event_guest(event_table_id);
CREATE INDEX IF NOT EXISTS idx_event_guest_reservation ON event_guest(reservation_id);

-- Trigger pro automatickou aktualizaci updated_at
CREATE OR REPLACE TRIGGER update_event_table_updated_at 
BEFORE UPDATE ON event_table
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Komentáře
COMMENT ON TABLE event_table IS 'Stoly pro akce s definicí místnosti, kapacity a pozice na plánku';
COMMENT ON COLUMN event_table.room IS 'Místnost stolu: roubenka, terasa, stodolka, cely_areal';
COMMENT ON COLUMN event_table.position_x IS 'X souřadnice na floor planu (pro drag & drop)';
COMMENT ON COLUMN event_table.position_y IS 'Y souřadnice na floor planu (pro drag & drop)';
COMMENT ON COLUMN event_guest.event_table_id IS 'Přiřazení hosta ke konkrétnímu stolu (null = nepřiřazený)';
COMMENT ON COLUMN event_guest.reservation_id IS 'Vazba na původní rezervaci (pro import hostů)';
COMMENT ON COLUMN event_guest.person_index IS 'Index osoby v původní rezervaci (pro tracking)';
