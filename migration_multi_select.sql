-- Migración ultra-segura e idempotente
DO $$ 
BEGIN
    -- 1. Convertir role_target a array si aún es texto simple
    IF (SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'daily_challenges' AND column_name = 'role_target') = 'text' THEN
        
        ALTER TABLE daily_challenges 
        ALTER COLUMN role_target TYPE TEXT[] 
        USING CASE 
          WHEN role_target IS NULL THEN NULL 
          ELSE ARRAY[role_target] 
        END;
    END IF;

    -- 2. Eliminar restricción de FK si existe
    ALTER TABLE daily_challenges DROP CONSTRAINT IF EXISTS daily_challenges_store_id_fkey;

    -- 3. Renombrar store_id a store_ids solo si store_id existe
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'daily_challenges' AND column_name = 'store_id') THEN
        ALTER TABLE daily_challenges RENAME COLUMN store_id TO store_ids;
    END IF;

    -- 4. Convertir store_ids a array si aún es UUID simple
    IF (SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'daily_challenges' AND column_name = 'store_ids') = 'uuid' THEN
        
        ALTER TABLE daily_challenges 
        ALTER COLUMN store_ids TYPE UUID[] 
        USING CASE 
          WHEN store_ids IS NULL THEN NULL 
          ELSE ARRAY[store_ids] 
        END;
    END IF;
END $$;
