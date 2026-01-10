-- ==============================================
-- Modul: Pokladna (Cashbox Management)
-- ==============================================
-- Výpis příjmů a výdajů, záznam pohybů v CZK/EUR,
-- okamžité zničení pokladny, výpočet výsledku akce

-- Pokladna
CREATE TABLE cashbox (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    currency VARCHAR(3) NOT NULL DEFAULT 'CZK', -- CZK, EUR
    initial_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    reservation_id INT REFERENCES reservation(id) ON DELETE SET NULL,
    -- event_id INT REFERENCES event(id) ON DELETE SET NULL, -- až bude Event tabulka
    opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    user_id INT REFERENCES "user"(id) ON DELETE SET NULL, -- kdo otevřel pokladnu
    notes TEXT
);

-- Pohyby v pokladně (příjmy/výdaje)
CREATE TABLE cash_movement (
    id SERIAL PRIMARY KEY,
    cashbox_id INT NOT NULL REFERENCES cashbox(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL, -- 'INCOME' (příjem), 'EXPENSE' (výdaj)
    category VARCHAR(100), -- 'FOOD', 'DRINKS', 'TICKETS', 'STAFF', 'SUPPLIES', 'OTHER'
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'CZK',
    description TEXT,
    payment_method VARCHAR(50), -- 'CASH', 'CARD', 'BANK_TRANSFER', 'VOUCHER'
    reference_id VARCHAR(100), -- reference na platbu, fakturu, apod.
    reservation_id INT REFERENCES reservation(id) ON DELETE SET NULL,
    -- event_id INT REFERENCES event(id) ON DELETE SET NULL, -- až bude Event
    user_id INT REFERENCES "user"(id) ON DELETE SET NULL, -- kdo provedl pohyb
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Uzávěrka pokladny
CREATE TABLE cashbox_closure (
    id SERIAL PRIMARY KEY,
    cashbox_id INT NOT NULL REFERENCES cashbox(id) ON DELETE CASCADE,
    expected_cash DECIMAL(15,2) NOT NULL, -- očekávaná hotovost
    actual_cash DECIMAL(15,2) NOT NULL, -- skutečná hotovost
    difference DECIMAL(15,2), -- rozdíl (přebytek/schodek)
    total_income DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_expense DECIMAL(15,2) NOT NULL DEFAULT 0,
    net_result DECIMAL(15,2), -- čistý výsledek (příjmy - výdaje)
    notes TEXT,
    closed_by INT REFERENCES "user"(id) ON DELETE SET NULL,
    closed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexy
CREATE INDEX idx_cashbox_reservation ON cashbox(reservation_id);
CREATE INDEX idx_cashbox_active ON cashbox(is_active);
CREATE INDEX idx_cash_movement_cashbox ON cash_movement(cashbox_id);
CREATE INDEX idx_cash_movement_type ON cash_movement(movement_type);
CREATE INDEX idx_cash_movement_category ON cash_movement(category);
CREATE INDEX idx_cash_movement_reservation ON cash_movement(reservation_id);
CREATE INDEX idx_cashbox_closure_cashbox ON cashbox_closure(cashbox_id);

-- Trigger pro automatickou aktualizaci current_balance
CREATE OR REPLACE FUNCTION update_cashbox_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.movement_type = 'INCOME' THEN
        UPDATE cashbox 
        SET current_balance = current_balance + NEW.amount 
        WHERE id = NEW.cashbox_id;
    ELSIF NEW.movement_type = 'EXPENSE' THEN
        UPDATE cashbox 
        SET current_balance = current_balance - NEW.amount 
        WHERE id = NEW.cashbox_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cash_movement
AFTER INSERT ON cash_movement
FOR EACH ROW
EXECUTE FUNCTION update_cashbox_balance();

-- Funkce pro okamžité zničení pokladny (smazání všech pohybů)
CREATE OR REPLACE FUNCTION destroy_cashbox(cashbox_id_param INT)
RETURNS VOID AS $$
BEGIN
    -- Smazání všech pohybů
    DELETE FROM cash_movement WHERE cashbox_id = cashbox_id_param;
    
    -- Reset pokladny
    UPDATE cashbox 
    SET current_balance = initial_balance,
        closed_at = NULL,
        is_active = false
    WHERE id = cashbox_id_param;
END;
$$ LANGUAGE plpgsql;

-- Funkce pro výpočet výsledku akce/rezervace
CREATE OR REPLACE FUNCTION calculate_event_result(p_reservation_id INT)
RETURNS TABLE (
    total_income DECIMAL(15,2),
    total_expense DECIMAL(15,2),
    net_result DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN cm.movement_type = 'INCOME' THEN cm.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN cm.movement_type = 'EXPENSE' THEN cm.amount ELSE 0 END), 0) as total_expense,
        COALESCE(SUM(CASE WHEN cm.movement_type = 'INCOME' THEN cm.amount ELSE -cm.amount END), 0) as net_result
    FROM cash_movement cm
    WHERE cm.reservation_id = p_reservation_id;
END;
$$ LANGUAGE plpgsql;

-- Komentáře
COMMENT ON TABLE cashbox IS 'Pokladny pro evidenci příjmů a výdajů';
COMMENT ON TABLE cash_movement IS 'Pohyby v pokladně (příjmy a výdaje)';
COMMENT ON TABLE cashbox_closure IS 'Uzávěrky pokladen';
COMMENT ON FUNCTION destroy_cashbox IS 'Okamžité zničení pokladny - smaže všechny pohyby';
COMMENT ON FUNCTION calculate_event_result IS 'Výpočet finančního výsledku akce/rezervace';
