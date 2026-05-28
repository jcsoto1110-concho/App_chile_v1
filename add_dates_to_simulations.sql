-- Añadir columnas de fechas a la tabla de simulaciones
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'simulations' AND column_name = 'active_date') THEN
        ALTER TABLE simulations ADD COLUMN active_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'simulations' AND column_name = 'end_date') THEN
        ALTER TABLE simulations ADD COLUMN end_date DATE;
    END IF;
END $$;
