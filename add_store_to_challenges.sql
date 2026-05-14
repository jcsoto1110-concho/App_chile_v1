-- Añadir columna store_id a daily_challenges para direccionamiento por tienda
ALTER TABLE daily_challenges ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
