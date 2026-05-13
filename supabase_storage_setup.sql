-- Crear bucket para contenidos de retos si no existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('challenges', 'challenges', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de seguridad para el bucket (Lectura pública)
CREATE POLICY "Contenido público de retos"
ON storage.objects FOR SELECT
USING (bucket_id = 'challenges');

-- Permitir a usuarios autenticados subir archivos
CREATE POLICY "Admins pueden subir contenido"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'challenges');

-- Permitir actualización y eliminación (Opcional pero recomendado para gestión)
CREATE POLICY "Admins pueden actualizar contenido"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'challenges');

CREATE POLICY "Admins pueden borrar contenido"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'challenges');
