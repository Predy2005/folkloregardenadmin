-- ==============================================
-- Modul: Provizní systém (Commission & Voucher)
-- ==============================================
-- Evidence voucherů, partnerů (hotel, recepce, Dana),
-- automatické výpočty provizí, QR skenování voucheru

-- Partner (hotel, recepce, distributor)
CREATE TABLE partner (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    partner_type VARCHAR(50) NOT NULL, -- 'HOTEL', 'RECEPTION', 'DISTRIBUTOR', 'OTHER'
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    commission_rate DECIMAL(5,2) DEFAULT 0, -- procento provize (např. 10.00 = 10%)
    commission_amount DECIMAL(10,2) DEFAULT 0, -- pevná částka provize (Kč)
    payment_method VARCHAR(50), -- 'BANK_TRANSFER', 'CASH', 'INVOICE'
    bank_account VARCHAR(100),
    ic VARCHAR(20), -- IČO
    dic VARCHAR(20), -- DIČ
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Voucher (slevový poukaz)
CREATE TABLE voucher (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE, -- unikátní kód voucheru (QR code)
    partner_id INT REFERENCES partner(id) ON DELETE SET NULL,
    voucher_type VARCHAR(50) NOT NULL, -- 'PERCENTAGE', 'FIXED_AMOUNT', 'FREE_ENTRY'
    discount_value DECIMAL(10,2), -- hodnota slevy (procenta nebo Kč)
    max_uses INT DEFAULT 1, -- max počet použití
    current_uses INT DEFAULT 0,
    valid_from DATE,
    valid_to DATE,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Použití voucheru (redemption)
CREATE TABLE voucher_redemption (
    id SERIAL PRIMARY KEY,
    voucher_id INT NOT NULL REFERENCES voucher(id) ON DELETE CASCADE,
    reservation_id INT REFERENCES reservation(id) ON DELETE SET NULL,
    -- event_id INT REFERENCES event(id) ON DELETE SET NULL, -- až bude Event tabulka
    redeemed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    redeemed_by INT REFERENCES "user"(id) ON DELETE SET NULL,
    discount_applied DECIMAL(10,2), -- skutečně aplikovaná sleva
    original_amount DECIMAL(10,2), -- původní částka před slevou
    final_amount DECIMAL(10,2), -- finální částka po slevě
    notes TEXT
);

-- Provizní log (výpočty provizí)
CREATE TABLE commission_log (
    id SERIAL PRIMARY KEY,
    partner_id INT NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
    voucher_id INT REFERENCES voucher(id) ON DELETE SET NULL,
    reservation_id INT REFERENCES reservation(id) ON DELETE SET NULL,
    -- event_id INT REFERENCES event(id) ON DELETE SET NULL, -- až bude Event tabulka
    commission_type VARCHAR(50) NOT NULL, -- 'VOUCHER_REDEMPTION', 'BOOKING', 'EVENT'
    base_amount DECIMAL(10,2) NOT NULL, -- základ pro výpočet provize
    commission_rate DECIMAL(5,2), -- použitá sazba provize
    commission_amount DECIMAL(10,2) NOT NULL, -- vypočtená provize
    payment_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'PAID', 'CANCELLED'
    payment_method VARCHAR(50), -- 'BANK_TRANSFER', 'CASH', 'INVOICE'
    paid_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexy
CREATE INDEX idx_voucher_code ON voucher(code);
CREATE INDEX idx_voucher_partner ON voucher(partner_id);
CREATE INDEX idx_voucher_redemption_voucher ON voucher_redemption(voucher_id);
CREATE INDEX idx_voucher_redemption_reservation ON voucher_redemption(reservation_id);
CREATE INDEX idx_commission_log_partner ON commission_log(partner_id);
CREATE INDEX idx_commission_log_voucher ON commission_log(voucher_id);
CREATE INDEX idx_commission_log_reservation ON commission_log(reservation_id);

-- Trigger pro automatické zvýšení current_uses
CREATE OR REPLACE FUNCTION increment_voucher_uses()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE voucher 
    SET current_uses = current_uses + 1 
    WHERE id = NEW.voucher_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_voucher_redemption
AFTER INSERT ON voucher_redemption
FOR EACH ROW
EXECUTE FUNCTION increment_voucher_uses();

-- Trigger pro automatickou aktualizaci updated_at
CREATE TRIGGER update_partner_updated_at BEFORE UPDATE ON partner
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voucher_updated_at BEFORE UPDATE ON voucher
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commission_log_updated_at BEFORE UPDATE ON commission_log
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Komentáře
COMMENT ON TABLE partner IS 'Partneři pro provizní systém (hotely, recepce, distributoři)';
COMMENT ON TABLE voucher IS 'Slevové poukazy / vouchery s QR kódy';
COMMENT ON TABLE voucher_redemption IS 'Historie uplatnění voucherů';
COMMENT ON TABLE commission_log IS 'Log provizí vyplacených partnerům';
