-- =====================================================
-- MIGRACIÓN MULTI-INQUILINO (SaaS)
-- =====================================================

-- 1. Crear tabla de Marcas (brands)
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  country VARCHAR(255) NOT NULL,
  primary_color VARCHAR(50) DEFAULT '#004882',
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, country)
);

-- 2. Insertar la marca inicial (Marathon Chile) para no romper la app actual
INSERT INTO public.brands (name, country, primary_color, logo_url)
VALUES (
    'Marathon', 
    'Chile', 
    '#004882', 
    'https://media.marathon.store/images/hde/h28/h00/8926515298334.png'
)
ON CONFLICT DO NOTHING;

-- 3. Agregar columnas brand_id y country a todas las tablas importantes
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id),
ADD COLUMN IF NOT EXISTS country VARCHAR(255) DEFAULT 'Chile';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id),
ADD COLUMN IF NOT EXISTS country VARCHAR(255) DEFAULT 'Chile';

ALTER TABLE public.daily_challenges
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id),
ADD COLUMN IF NOT EXISTS country VARCHAR(255) DEFAULT 'Chile';

ALTER TABLE public.knowledge_documents
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id),
ADD COLUMN IF NOT EXISTS country VARCHAR(255) DEFAULT 'Chile';

ALTER TABLE public.simulations
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id),
ADD COLUMN IF NOT EXISTS country VARCHAR(255) DEFAULT 'Chile';

-- 4. Asignar la marca "Marathon Chile" a TODOS los registros existentes
DO $$
DECLARE
    default_brand_id UUID;
BEGIN
    SELECT id INTO default_brand_id FROM public.brands WHERE name = 'Marathon' AND country = 'Chile' LIMIT 1;
    
    IF default_brand_id IS NOT NULL THEN
        UPDATE public.stores SET brand_id = default_brand_id WHERE brand_id IS NULL;
        UPDATE public.profiles SET brand_id = default_brand_id WHERE brand_id IS NULL;
        UPDATE public.daily_challenges SET brand_id = default_brand_id WHERE brand_id IS NULL;
        UPDATE public.knowledge_documents SET brand_id = default_brand_id WHERE brand_id IS NULL;
        UPDATE public.simulations SET brand_id = default_brand_id WHERE brand_id IS NULL;
    END IF;
END $$;

-- 5. Habilitar Row Level Security y políticas para super admin
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Aseguramos que no existan políticas con el mismo nombre
DROP POLICY IF EXISTS superadmin_insert_brand ON public.brands;
DROP POLICY IF EXISTS superadmin_update_brand ON public.brands;
DROP POLICY IF EXISTS superadmin_delete_brand ON public.brands;

CREATE POLICY superadmin_insert_brand ON public.brands FOR INSERT TO authenticated
  WITH CHECK (auth.email() = ANY(ARRAY['admin@marathon.cl','jcsoto@gmail.com']));

CREATE POLICY superadmin_update_brand ON public.brands FOR UPDATE TO authenticated
  USING (auth.email() = ANY(ARRAY['admin@marathon.cl','jcsoto@gmail.com']));

CREATE POLICY superadmin_delete_brand ON public.brands FOR DELETE TO authenticated
  USING (auth.email() = ANY(ARRAY['admin@marathon.cl','jcsoto@gmail.com']));
