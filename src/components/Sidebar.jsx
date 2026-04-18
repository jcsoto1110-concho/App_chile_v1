import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Target, Bot, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Sidebar() {
  const handleLogout = async () => {
     await supabase.auth.signOut();
     window.location.reload();
  };

  return (
    <aside style={{ width: '260px', height: '100vh', position: 'sticky', top: 0, padding: '24px', background: 'var(--bg-card)', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
       <div style={{ marginBottom: '40px', padding: '0 12px' }}>
         <h2 className="text-gradient" style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
           <Target />
           SmartCoach
         </h2>
       </div>

       <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <SidebarLink to="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard General" />
          <SidebarLink to="/users" icon={<Users size={20} />} label="Usuarios Colaboradores" />
          <SidebarLink to="/challenges" icon={<Target size={20} />} label="Retos Diarios" />
          <SidebarLink to="/simulations" icon={<Bot size={20} />} label="Simulador IA" />
       </nav>

       <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--text-muted)' }}>
             <LogOut size={20} />
             Cerrar Sesión
          </button>
       </div>
    </aside>
  );
}

function SidebarLink({ to, icon, label }) {
  return (
    <NavLink 
      to={to}
      style={({ isActive }) => ({
         display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
         color: isActive ? '#fff' : 'var(--text-muted)',
         background: isActive ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(112, 0, 255, 0.1))' : 'transparent',
         borderLeft: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
         textDecoration: 'none',
         fontWeight: 500,
         transition: 'all 0.2s',
         fontSize: '0.95rem'
      })}
    >
       {icon}
       {label}
    </NavLink>
  );
}
