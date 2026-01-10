-- ==============================================
-- Modul: Akce / Event
-- ==============================================
-- Možnost ručně vytvořit nebo automaticky z rezervace,
-- personál k akci, organizační plán, catering

-- Akce/Event
CREATE TABLE event (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'FOLKLORE_SHOW', 'WEDDING', 'PRIVATE_EVENT', 'CORPORATE'
    reservation_id INT REFERENCES reservation(id) ON DELETE SET NULL, -- pokud vygenerováno z rezervace
    
    -- Základní údaje
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    duration_minutes INT DEFAULT 120,
    
    -- Počet osob
    guests_paid INT NOT NULL DEFAULT 0,
    guests_free INT DEFAULT 0,
    guests_total INT GENERATED ALWAYS AS (guests_paid + guests_free) STORED,
    
    -- Místo konání
    venue VARCHAR(100), -- 'ROUBENKA', 'TERASA', 'STODOLA', 'CELY_AREAL', 'STANK', 'KOVARNA'
    
    -- Kontaktní údaje organizátora
    organizer_company VARCHAR(255),
    organizer_person VARCHAR(255),
    organizer_email VARCHAR(255),
    organizer_phone VARCHAR(50),
    
    -- Jazykové verze
    language VARCHAR(10) DEFAULT 'CZ', -- 'CZ', 'EN', 'SP', 'DE'
    
    -- Fakturační údaje
    invoice_company VARCHAR(255),
    invoice_ic VARCHAR(20),
    invoice_dic VARCHAR(20),
    invoice_address TEXT,
    
    -- Platba
    total_price DECIMAL(15,2),
    deposit_amount DECIMAL(15,2),
    deposit_paid BOOLEAN DEFAULT false,
    payment_method VARCHAR(50), -- 'CASH', 'BANK_TRANSFER', 'CARD', 'INVOICE'
    
    -- Status
    status VARCHAR(50) DEFAULT 'PLANNED', -- 'PLANNED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    
    -- Poznámky
    notes_staff TEXT, -- poznámky pro personál
    notes_internal TEXT, -- interní poznámky
    special_requirements TEXT, -- speciální požadavky (bezlepková strava, alergie, apod.)
    
    -- Metadata
    created_by INT REFERENCES "user"(id) ON DELETE SET NULL,
    coordinator_id INT REFERENCES staff_member(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seznam hostů pro akci
CREATE TABLE event_guest (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    nationality VARCHAR(50),
    is_paid BOOLEAN DEFAULT true,
    table_number INT, -- přiřazení ke stolu
    seat_number INT, -- číslo místa u stolu
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Přiřazení jídel k akci
CREATE TABLE event_menu (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    reservation_food_id INT REFERENCES reservation_foods(id) ON DELETE SET NULL,
    menu_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    price_per_unit DECIMAL(10,2),
    total_price DECIMAL(10,2),
    serving_time TIME, -- čas podávání
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Přiřazení nápojů k akci
CREATE TABLE event_beverage (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    beverage_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 0, -- počet lahví/jednotek
    unit VARCHAR(50) DEFAULT 'bottle', -- 'bottle', 'glass', 'liter'
    price_per_unit DECIMAL(10,2),
    total_price DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Přiřazení personálu k akci
CREATE TABLE event_staff_assignment (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    staff_member_id INT NOT NULL REFERENCES staff_member(id) ON DELETE CASCADE,
    staff_role_id INT REFERENCES staff_role(id) ON DELETE SET NULL,
    assignment_status VARCHAR(50) DEFAULT 'ASSIGNED', -- 'ASSIGNED', 'CONFIRMED', 'DECLINED', 'COMPLETED'
    attendance_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'PRESENT', 'ABSENT', 'LATE'
    hours_worked DECIMAL(5,2) DEFAULT 0,
    payment_amount DECIMAL(10,2),
    payment_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'PAID'
    notes TEXT,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    attended_at TIMESTAMP
);

-- Časový harmonogram akce
CREATE TABLE event_schedule (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    time_slot TIME NOT NULL,
    duration_minutes INT DEFAULT 30,
    activity VARCHAR(255) NOT NULL, -- 'ARRIVAL', 'WELCOME_DRINK', 'DINNER', 'SHOW', 'DANCE', 'CLOSING'
    description TEXT,
    responsible_staff_id INT REFERENCES staff_member(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Vouchery pro akci
CREATE TABLE event_voucher (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    voucher_id INT NOT NULL REFERENCES voucher(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1,
    validated BOOLEAN DEFAULT false,
    validated_at TIMESTAMP,
    validated_by INT REFERENCES "user"(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexy
CREATE INDEX idx_event_date ON event(event_date);
CREATE INDEX idx_event_type ON event(event_type);
CREATE INDEX idx_event_status ON event(status);
CREATE INDEX idx_event_reservation ON event(reservation_id);
CREATE INDEX idx_event_guest_event ON event_guest(event_id);
CREATE INDEX idx_event_menu_event ON event_menu(event_id);
CREATE INDEX idx_event_beverage_event ON event_beverage(event_id);
CREATE INDEX idx_event_staff_assignment_event ON event_staff_assignment(event_id);
CREATE INDEX idx_event_staff_assignment_member ON event_staff_assignment(staff_member_id);
CREATE INDEX idx_event_schedule_event ON event_schedule(event_id);
CREATE INDEX idx_event_voucher_event ON event_voucher(event_id);

-- Trigger pro automatickou aktualizaci updated_at
CREATE TRIGGER update_event_updated_at BEFORE UPDATE ON event
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Funkce pro vytvoření akce z rezervace
CREATE OR REPLACE FUNCTION create_event_from_reservation(p_reservation_id INT)
RETURNS INT AS $$
DECLARE
    v_event_id INT;
    v_reservation reservation%ROWTYPE;
BEGIN
    -- Načtení rezervace
    SELECT * INTO v_reservation FROM reservation WHERE id = p_reservation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rezervace s ID % nebyla nalezena', p_reservation_id;
    END IF;
    
    -- Vytvoření akce
    INSERT INTO event (
        name,
        event_type,
        reservation_id,
        event_date,
        event_time,
        organizer_person,
        organizer_email,
        organizer_phone,
        language,
        status,
        created_at
    ) VALUES (
        'Akce z rezervace #' || p_reservation_id,
        'FOLKLORE_SHOW',
        p_reservation_id,
        v_reservation.date,
        '18:00:00', -- výchozí čas
        v_reservation.contact_name,
        v_reservation.contact_email,
        v_reservation.contact_phone,
        v_reservation.contact_nationality,
        'PLANNED',
        CURRENT_TIMESTAMP
    ) RETURNING id INTO v_event_id;
    
    -- Zkopírování osob z rezervace jako hostů akce
    INSERT INTO event_guest (event_id, first_name, nationality, is_paid)
    SELECT 
        v_event_id,
        rp.type || ' #' || rp.id,
        v_reservation.contact_nationality,
        true
    FROM reservation_person rp
    WHERE rp.reservation_id = p_reservation_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Komentáře
COMMENT ON TABLE event IS 'Akce/události (folklórní show, svatby, privátní akce)';
COMMENT ON TABLE event_guest IS 'Seznam hostů pro akci';
COMMENT ON TABLE event_menu IS 'Menu pro akci';
COMMENT ON TABLE event_beverage IS 'Nápoje pro akci';
COMMENT ON TABLE event_staff_assignment IS 'Přiřazení personálu k akci';
COMMENT ON TABLE event_schedule IS 'Časový harmonogram akce';
COMMENT ON TABLE event_voucher IS 'Vouchery použité na akci';
COMMENT ON FUNCTION create_event_from_reservation IS 'Vytvoření akce z existující rezervace';
