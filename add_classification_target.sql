-- Migración para Clasificación de Usuarios (Challenger, Performer, All Star, Alto desempeño, Marathon Legend)

-- 1. Agregar columna de clasificación a perfiles si no existe
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS classification VARCHAR(50) DEFAULT 'Challenger';

-- 2. Agregar columna de clasificación destino a retos diarios si no existe
ALTER TABLE public.daily_challenges 
ADD COLUMN IF NOT EXISTS classification_target VARCHAR(50) DEFAULT 'Challenger';

-- 3. Agregar columna de clasificación destino a simulaciones si no existe
ALTER TABLE public.simulations 
ADD COLUMN IF NOT EXISTS classification_target VARCHAR(50) DEFAULT 'Challenger';
