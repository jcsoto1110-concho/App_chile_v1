import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageSquare, User, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export default function MobileLayout() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [liveChallenge, setLiveChallenge] = useState(null);

  useEffect(() => {
     if (!profile) return;
     // Rastreador automático
     const poller = setInterval(async () => {
         const todayRaw = new Date().toISOString().split('T')[0];
         const { data: lives } = await supabase.from('daily_challenges')
            .select('*').eq('is_live', true).gte('active_date', todayRaw);
            
         if (lives && lives.length > 0) {
             const { data: taken } = await supabase.from('user_progress')
                 .select('challenge_id').eq('user_id', profile.id);
             const takenIds = taken ? taken.map(t => t.challenge_id) : [];
             
             // Buscar un reto vivo que el usuario NO haya tomado aún
             const availableLive = lives.find(l => !takenIds.includes(l.id));
             
             // Si existe y no está ya metido en la pantalla de test
             if (availableLive && location.pathname !== '/app/quiz') {
                 setLiveChallenge(availableLive);
             } else if (!availableLive) {
                 setLiveChallenge(null);
             }
         } else {
             setLiveChallenge(null);
         }
     }, 10000); // Consulta cada 10s sin saturar web socket

     return () => clearInterval(poller);
  }, [profile, location.pathname]);

  const enterLive = () => {
      navigate('/app/quiz', { state: { challenge: liveChallenge } });
      setLiveChallenge(null);
  };

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Marco simulado de Celular para visualización en PC */}
      <div style={{ 
          width: '100%', 
          maxWidth: '414px', 
          height: '100vh', 
          maxHeight: '896px', 
          backgroundColor: 'var(--bg-dark)', 
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 0 50px rgba(0,240,255,0.1)',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          borderRight: '1px solid rgba(255,255,255,0.05)'
      }}>
          
         {liveChallenge && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 9999, background: 'rgba(255, 0, 80, 0.95)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', animation: 'pulse-bg 2s infinite' }}>
                <AlertTriangle size={64} fill="#fff" color="#ff1493" style={{ marginBottom: '24px', animation: 'bounce 1s infinite' }} />
                <h1 style={{ color: '#fff', fontSize: '2rem', marginBottom: '8px', textTransform: 'uppercase', lineHeight: 1.1 }}>Reto En Vivo</h1>
                <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '32px', fontSize: '1.1rem' }}>¡Atención Piso de Ventas! Tu supervisor acaba de lanzar el evento: <strong>{liveChallenge.title}</strong>.</p>
                <button onClick={enterLive} style={{ background: '#fff', color: '#ff1493', border: 'none', padding: '16px 32px', fontSize: '1.2rem', fontWeight: 800, borderRadius: '30px', width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', cursor: 'pointer' }}>
                   Entrar Ahora
                </button>
                <style>{`@keyframes pulse-bg { 0% { background: rgba(255, 0, 50, 0.9); } 50% { background: rgba(255, 0, 100, 0.95); } 100% { background: rgba(255, 0, 50, 0.9); } }`}</style>
            </div>
         )}
         
         {/* Área dinámica donde cargarán las vistas móviles */}
         <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '70px', overflow: 'hidden' }}>
            <Outlet />
         </div>

         {/* Barra de Navegación Inferior (Bottom Bar) */}
         <nav style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '70px',
            background: 'rgba(15, 17, 21, 0.95)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            paddingBottom: 'env(safe-area-inset-bottom)'
         }}>
             <NavItem to="/app/home" icon={<Home size={24} />} label="Misiones" />
             <NavItem to="/app/simulator" icon={<MessageSquare size={24} />} label="Simulador" />
             <NavItem to="/app/profile" icon={<User size={24} />} label="Mi Nivel" />
         </nav>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink 
      to={to}
      style={({ isActive }) => ({
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        textDecoration: 'none',
        gap: '4px',
        color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
        transition: 'all var(--transition-smooth)'
      })}
    >
      {icon}
      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{label}</span>
    </NavLink>
  );
}
