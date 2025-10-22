-- ==============================================
-- Modul: Personální evidence (Staff Management)
-- ==============================================
-- Výpis všech členů personálu, historie účasti na akcích,
-- export do Excelu, výpočet potřebných sil podle počtu osob

-- Člen personálu
CREATE TABLE staff_member (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    address TEXT,
    date_of_birth DATE,
    position VARCHAR(100), -- 'COORDINATOR', 'WAITER', 'COOK', 'DANCER', 'BAND', 'MODERATOR', 'HELPER', 'PHOTOGRAPHER'
    hourly_rate DECIMAL(10,2), -- hodinová sazba (Kč)
    fixed_rate DECIMAL(10,2), -- pevná sazba za akci (Kč)
    is_active BOOLEAN DEFAULT true,
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Typ role personálu (pro flexibilnější správu rolí)
CREATE TABLE staff_role (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    required_per_guests INT DEFAULT 0, -- kolik osob této role je potřeba na X hostů
    guests_ratio INT DEFAULT 10, -- např. 1 číšník na 10 hostů
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Přiřazení role členovi personálu
CREATE TABLE staff_member_role (
    id SERIAL PRIMARY KEY,
    staff_member_id INT NOT NULL REFERENCES staff_member(id) ON DELETE CASCADE,
    staff_role_id INT NOT NULL REFERENCES staff_role(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false, -- primární role
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_member_id, staff_role_id)
);

-- Přiřazení personálu k rezervaci (dočasné, než bude Event tabulka)
CREATE TABLE staff_reservation_assignment (
    id SERIAL PRIMARY KEY,
    staff_member_id INT NOT NULL REFERENCES staff_member(id) ON DELETE CASCADE,
    reservation_id INT NOT NULL REFERENCES reservation(id) ON DELETE CASCADE,
    staff_role_id INT REFERENCES staff_role(id) ON DELETE SET NULL,
    assignment_status VARCHAR(50) DEFAULT 'ASSIGNED', -- 'ASSIGNED', 'CONFIRMED', 'DECLINED', 'COMPLETED'
    attendance_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'PRESENT', 'ABSENT', 'LATE'
    hours_worked DECIMAL(5,2) DEFAULT 0,
    payment_amount DECIMAL(10,2), -- vypočtená platba
    payment_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'PAID'
    notes TEXT,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    attended_at TIMESTAMP
);

-- Přiřazení personálu k akci (až bude Event tabulka)
-- CREATE TABLE staff_event_assignment (
--     id SERIAL PRIMARY KEY,
--     staff_member_id INT NOT NULL REFERENCES staff_member(id) ON DELETE CASCADE,
--     event_id INT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
--     staff_role_id INT REFERENCES staff_role(id) ON DELETE SET NULL,
--     assignment_status VARCHAR(50) DEFAULT 'ASSIGNED',
--     attendance_status VARCHAR(50) DEFAULT 'PENDING',
--     hours_worked DECIMAL(5,2) DEFAULT 0,
--     payment_amount DECIMAL(10,2),
--     payment_status VARCHAR(50) DEFAULT 'PENDING',
--     notes TEXT,
--     assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     confirmed_at TIMESTAMP,
--     attended_at TIMESTAMP
-- );

-- Docházka (samostatná tabulka pro evidenci)
CREATE TABLE staff_attendance (
    id SERIAL PRIMARY KEY,
    staff_member_id INT NOT NULL REFERENCES staff_member(id) ON DELETE CASCADE,
    reservation_id INT REFERENCES reservation(id) ON DELETE SET NULL,
    -- event_id INT REFERENCES event(id) ON DELETE SET NULL, -- až bude Event
    attendance_date DATE NOT NULL,
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    hours_worked DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexy
CREATE INDEX idx_staff_member_position ON staff_member(position);
CREATE INDEX idx_staff_member_active ON staff_member(is_active);
CREATE INDEX idx_staff_member_role_member ON staff_member_role(staff_member_id);
CREATE INDEX idx_staff_member_role_role ON staff_member_role(staff_role_id);
CREATE INDEX idx_staff_reservation_assignment_member ON staff_reservation_assignment(staff_member_id);
CREATE INDEX idx_staff_reservation_assignment_reservation ON staff_reservation_assignment(reservation_id);
CREATE INDEX idx_staff_attendance_member ON staff_attendance(staff_member_id);
CREATE INDEX idx_staff_attendance_date ON staff_attendance(attendance_date);

-- Trigger pro automatickou aktualizaci updated_at
CREATE TRIGGER update_staff_member_updated_at BEFORE UPDATE ON staff_member
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Výchozí role
INSERT INTO staff_role (name, description, required_per_guests, guests_ratio) VALUES
('Koordinátor', 'Koordinátor akce', 1, 0),
('Číšník', 'Obsluha hostů', 1, 10),
('Kuchař', 'Příprava jídla', 1, 20),
('Tanečník', 'Folklórní tanec', 4, 0),
('Kapela', 'Hudební doprovod', 3, 0),
('Moderátor', 'Moderování programu', 1, 0),
('Pomocná síla', 'Pomocné práce', 1, 15),
('Fotograf', 'Fotografování akce', 1, 0);

-- Komentáře
COMMENT ON TABLE staff_member IS 'Členové personálu';
COMMENT ON TABLE staff_role IS 'Typy rolí personálu';
COMMENT ON TABLE staff_member_role IS 'Přiřazení rolí členům personálu';
COMMENT ON TABLE staff_reservation_assignment IS 'Přiřazení personálu k rezervacím';
COMMENT ON TABLE staff_attendance IS 'Evidence docházky personálu';
