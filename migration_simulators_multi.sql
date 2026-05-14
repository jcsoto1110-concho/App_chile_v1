-- Migración para Simuladores IA: Selección múltiple de roles y tiendas
DO $$ 
BEGIN
    -- 1. Convertir role_target a array en la tabla simulations
    IF (SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'simulations' AND column_name = 'role_target') = 'text' THEN
        
        ALTER TABLE simulations 
        ALTER COLUMN role_target TYPE TEXT[] 
        USING CASE 
          WHEN role_target IS NULL THEN NULL 
          ELSE ARRAY[role_target] 
        END;
    END IF;

    -- 2. Asegurar que exista store_ids como array de UUIDs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'simulations' AND column_name = 'store_ids') THEN
        ALTER TABLE simulations ADD COLUMN store_ids UUID[];
    END IF;
END $$;
