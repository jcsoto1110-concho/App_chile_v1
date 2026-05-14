-- Tabla para notificaciones/recordatorios de Jefes a Colaboradores
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES profiles(id),
    message TEXT NOT NULL,
    type TEXT DEFAULT 'nudge', -- 'nudge', 'reward', 'info'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Users can see their own notifications" ON user_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Managers can insert notifications for their team" ON user_notifications
    FOR INSERT WITH CHECK (TRUE); -- Simplificado para desarrollo, idealmente verificar store_id
