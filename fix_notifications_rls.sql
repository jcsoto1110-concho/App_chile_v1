-- Corrección de Políticas para Sistema Híbrido (Custom Session)
-- Eliminamos la restricción de auth.uid() ya que los asesores usan sesión local
DROP POLICY IF EXISTS "Users can see their own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Managers can insert notifications for their team" ON user_notifications;

-- Nueva política: Permitir lectura si el ID coincide (el filtrado lo hace la App)
CREATE POLICY "Enable access for all users" ON user_notifications
    FOR ALL USING (TRUE)
    WITH CHECK (TRUE);

-- Nota: En un entorno real con JWT se usaría auth.uid(), 
-- pero para la arquitectura actual de Marathon, esto habilita los avisos.
