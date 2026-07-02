-- Script para insertar masivamente las tiendas de Nike
DO $$
DECLARE
    v_brand_id UUID;
BEGIN
    -- 1. Intentar buscar la marca Nike (para Chile)
    SELECT id INTO v_brand_id FROM public.brands WHERE name ILIKE '%Nike%' LIMIT 1;
    
    -- 2. Si la marca no existe, la creamos automáticamente
    IF v_brand_id IS NULL THEN
        INSERT INTO public.brands (name, country, primary_color) 
        VALUES ('Nike', 'Chile', '#000000') 
        RETURNING id INTO v_brand_id;
    END IF;

    -- 3. Insertar las tiendas asociadas a la marca encontrada o creada
    INSERT INTO public.stores (name, location, brand_id, country) VALUES 
    ('NVS Irarrázaval', 'Santiago', v_brand_id, 'Chile'),
    ('NVS Maipú', 'Santiago', v_brand_id, 'Chile'),
    ('NVS Puente Alto', 'Santiago', v_brand_id, 'Chile'),
    ('NVS Buenaventura', 'Santiago', v_brand_id, 'Chile'),
    ('NVS Curauma', 'Valparaíso', v_brand_id, 'Chile'),
    ('NVS San Ignacio', 'Santiago', v_brand_id, 'Chile'),
    ('NVS Concepción', 'Concepción', v_brand_id, 'Chile'),
    ('NSO Parque Arauco', 'Santiago', v_brand_id, 'Chile'),
    ('NSO Arauco Maipú', 'Santiago', v_brand_id, 'Chile'),
    ('NSO Plaza Oeste', 'Santiago', v_brand_id, 'Chile'),
    ('NSO Plaza Egaña', 'Santiago', v_brand_id, 'Chile'),
    ('NSO Vespucio', 'Santiago', v_brand_id, 'Chile'),
    ('NSO Alto las Condes', 'Santiago', v_brand_id, 'Chile'),
    ('NSO MUT', 'Santiago', v_brand_id, 'Chile'),
    ('NSO Costanera Center', 'Santiago', v_brand_id, 'Chile');
    
    RAISE NOTICE 'Tiendas de Nike insertadas correctamente bajo el brand_id: %', v_brand_id;
END $$;
