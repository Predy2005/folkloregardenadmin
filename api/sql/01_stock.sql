-- ==============================================
-- Modul: Sklad (Stock Management)
-- ==============================================
-- Evidence jídla dle gramáže, počet dostupných porcí,
-- výpočet skladových zásob na základě receptur,
-- vystavení výdejek na základě rezervací/akcí

-- Skladová položka (surovina, ingredience)
CREATE TABLE stock_item (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) NOT NULL DEFAULT 'kg', -- kg, l, ks, g, ml
    quantity_available DECIMAL(10,2) NOT NULL DEFAULT 0,
    min_quantity DECIMAL(10,2) DEFAULT 0, -- minimální zásoba pro alert
    price_per_unit DECIMAL(10,2),
    supplier VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Receptura (recept pro přípravu jídla)
CREATE TABLE recipe (
    id SERIAL PRIMARY KEY,
    reservation_food_id INT REFERENCES reservation_foods(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    portions INT NOT NULL DEFAULT 1, -- počet porcí
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ingredience v receptuře
CREATE TABLE recipe_ingredient (
    id SERIAL PRIMARY KEY,
    recipe_id INT NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
    stock_item_id INT NOT NULL REFERENCES stock_item(id) ON DELETE CASCADE,
    quantity_required DECIMAL(10,2) NOT NULL, -- množství potřebné pro recepturu
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Pohyby na skladě (příjmy/výdaje)
CREATE TABLE stock_movement (
    id SERIAL PRIMARY KEY,
    stock_item_id INT NOT NULL REFERENCES stock_item(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL, -- 'IN' (příjem), 'OUT' (výdej), 'ADJUSTMENT' (oprava)
    quantity DECIMAL(10,2) NOT NULL,
    reason TEXT,
    reservation_id INT REFERENCES reservation(id) ON DELETE SET NULL,
    -- event_id INT REFERENCES event(id) ON DELETE SET NULL, -- až bude Event tabulka
    user_id INT REFERENCES "user"(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexy pro rychlejší dotazy
CREATE INDEX idx_stock_movement_stock_item ON stock_movement(stock_item_id);
CREATE INDEX idx_stock_movement_reservation ON stock_movement(reservation_id);
CREATE INDEX idx_recipe_ingredient_recipe ON recipe_ingredient(recipe_id);
CREATE INDEX idx_recipe_ingredient_stock_item ON recipe_ingredient(stock_item_id);

-- Triggery pro automatickou aktualizaci skladových zásob
CREATE OR REPLACE FUNCTION update_stock_quantity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.movement_type = 'IN' THEN
        UPDATE stock_item 
        SET quantity_available = quantity_available + NEW.quantity 
        WHERE id = NEW.stock_item_id;
    ELSIF NEW.movement_type = 'OUT' THEN
        UPDATE stock_item 
        SET quantity_available = quantity_available - NEW.quantity 
        WHERE id = NEW.stock_item_id;
    ELSIF NEW.movement_type = 'ADJUSTMENT' THEN
        UPDATE stock_item 
        SET quantity_available = NEW.quantity 
        WHERE id = NEW.stock_item_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_stock_movement
AFTER INSERT ON stock_movement
FOR EACH ROW
EXECUTE FUNCTION update_stock_quantity();

-- Trigger pro automatickou aktualizaci updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stock_item_updated_at BEFORE UPDATE ON stock_item
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipe_updated_at BEFORE UPDATE ON recipe
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Komentáře
COMMENT ON TABLE stock_item IS 'Skladové položky - suroviny a ingredience';
COMMENT ON TABLE recipe IS 'Receptury pro přípravu jídel';
COMMENT ON TABLE recipe_ingredient IS 'Ingredience použité v recepturách';
COMMENT ON TABLE stock_movement IS 'Historie pohybů na skladě';
