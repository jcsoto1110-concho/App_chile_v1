-- Schema para Coach Inteligente (Retail)

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de Tiendas
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roles permitidos (Enum)
-- CREATE TYPE user_role AS ENUM ('asesor', 'cajero', 'bodeguero', 'admin', 'supervisor');

-- Tabla de Usuarios (Extensión lógica a la tabla de Auth de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- Esto deberá relacionarse con auth.users(id) cuando los usuarios se registren, pero lo dejaremos así por ahora para simplificar el MVP local
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'asesor', -- 'asesor', 'cajero', 'admin'
    store_id UUID REFERENCES public.stores(id),
    current_level INT DEFAULT 1,
    current_xp INT DEFAULT 0,
    fitcoins INT DEFAULT 0,
    streak_days INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Retos Diarios (Microlearning)
CREATE TABLE IF NOT EXISTS public.daily_challenges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    content_url TEXT, -- Opcional, URL a video/imagen
    role_target VARCHAR(50), -- Si es nulo, aplica para todos
    reward_xp INT DEFAULT 10,
    reward_fitcoins INT DEFAULT 5,
    active_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Historial de Progreso de Usuarios (Retos completados)
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    score INT DEFAULT 100,
    UNIQUE(user_id, challenge_id)
);

-- Tabla de Simulaciones IA
CREATE TABLE IF NOT EXISTS public.simulations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    scenario_description TEXT NOT NULL,
    role_target VARCHAR(50) NOT NULL,
    ai_persona TEXT NOT NULL, -- Ej: "Cliente apurado y molesto"
    evaluation_criteria JSONB NOT NULL, -- Criterios de evaluación en JSON
    reward_xp INT DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INSERT INCIO (Mock Data)
INSERT INTO public.stores (id, name, location) VALUES 
('11111111-1111-1111-1111-111111111111', 'Marathon Sports - Mall Costanera', 'Santiago, Chile');

INSERT INTO public.profiles (id, email, full_name, role, store_id) VALUES 
('22222222-2222-2222-2222-222222222222', 'admin@marathon.cl', 'Administrador Principal', 'admin', '11111111-1111-1111-1111-111111111111');
