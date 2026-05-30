-- Política para permitir lectura pública de marcas (requerido para inicio de sesión local)
DROP POLICY IF EXISTS select_brands ON public.brands;
CREATE POLICY select_brands ON public.brands 
    FOR SELECT TO public 
    USING (TRUE);
