-- =========================================================================
-- MIGRACIÓN: CORRECCIÓN DE RESTRICCIONES DE LLAVE FORÁNEA AL ELIMINAR USUARIOS
-- =========================================================================

-- 1. Notificaciones: Cambiar manager_id para que sea NULL al borrar el manager/perfil
ALTER TABLE public.user_notifications 
DROP CONSTRAINT IF EXISTS user_notifications_manager_id_fkey;

ALTER TABLE public.user_notifications 
ADD CONSTRAINT user_notifications_manager_id_fkey 
FOREIGN KEY (manager_id) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- 2. Documentos de Conocimiento: Cambiar uploaded_by para que sea NULL al borrar el admin/perfil
ALTER TABLE public.knowledge_documents 
DROP CONSTRAINT IF EXISTS knowledge_documents_uploaded_by_fkey;

ALTER TABLE public.knowledge_documents 
ADD CONSTRAINT knowledge_documents_uploaded_by_fkey 
FOREIGN KEY (uploaded_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- 3. Progreso de Simulaciones: Asegurar ON DELETE CASCADE al eliminar al usuario
ALTER TABLE public.user_simulation_progress 
DROP CONSTRAINT IF EXISTS user_simulation_progress_user_id_fkey;

ALTER TABLE public.user_simulation_progress 
ADD CONSTRAINT user_simulation_progress_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;
