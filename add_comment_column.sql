-- Añadir columna de comentario a la tabla de progreso de usuario
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS comment TEXT;
