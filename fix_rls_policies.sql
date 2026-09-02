-- Habilita el acceso total (Lectura, Inserción, Actualización, Eliminación) 
-- para todas las tablas en el esquema 'public'.
-- IMPORTANTE: Este script es ideal para entornos de desarrollo. 
-- Para producción, debes configurar políticas más estrictas según el rol del usuario.

DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    -- Iterar sobre todas las tablas del esquema public
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP 
        -- 1. Asegurarse de que RLS está activado en la tabla
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
        
        -- 2. Eliminar la política permisiva si ya existía previamente para evitar duplicados
        BEGIN
            EXECUTE 'DROP POLICY IF EXISTS "Permitir_todo_a_todos" ON public.' || quote_ident(r.tablename) || ';';
        EXCEPTION WHEN OTHERS THEN
            -- Ignorar si la política no existe
        END;

        -- 3. Crear una nueva política que permite TODO a TODOS (anon y authenticated)
        EXECUTE 'CREATE POLICY "Permitir_todo_a_todos" ON public.' || quote_ident(r.tablename) || ' FOR ALL USING (true) WITH CHECK (true);';
        
        RAISE NOTICE 'Políticas permisivas aplicadas a la tabla: %', r.tablename;
    END LOOP; 
END $$;
