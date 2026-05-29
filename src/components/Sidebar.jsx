import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Target, Bot, LogOut, Store, BookOpen, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export default function Sidebar() {
  const { profile, isSuperAdmin } = useAuth();
  
  const handleLogout = async () => {
     await supabase.auth.signOut();
     localStorage.removeItem('custom_session');
     window.location.href = '/';
  };

  const brandLogo = profile?.brands?.logo_url || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTEgchTEviXZbR9fCBYfcubPtikMqvbP86fZlVBBKb9Zz6VsrdOcpPG7m2HciKiivV0eQ&usqp=CAU';

  return (
    <aside style={{ width: '260px', height: '100vh', position: 'sticky', top: 0, padding: '24px', background: 'var(--accent-primary)', borderRight: 'none', display: 'flex', flexDirection: 'column' }}>
       <div style={{ marginBottom: '40px', padding: '0 12px' }}>
         <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: 800 }}>
           <Target />
           SmartCoach
         </h2>
         <div style={{ marginTop: '16px', display: 'inline-block', background: '#fff', padding: '4px', borderRadius: '4px' }}>
            <img 
               src={brandLogo} 
               alt={profile?.brands?.name || 'Marca'} 
               style={{ width: '150px', display: 'block', maxHeight: '50px', objectFit: 'contain' }} 
            />
         </div>
       </div>

       <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <SidebarLink to="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard General" />
          <SidebarLink to="/store-detail" icon={<Store size={20} />} label="Detalle por Tienda" />
          <SidebarLink to="/users" icon={<Users size={20} />} label="Usuarios Colaboradores" />
          <SidebarLink to="/challenges" icon={<Target size={20} />} label="Retos Diarios" />
          <SidebarLink to="/simulations" icon={<Bot size={20} />} label="Simulador IA" />
          <SidebarLink to="/preguntame" icon={<BookOpen size={20} />} label="Pregúntame" />
          {isSuperAdmin && (
            <SidebarLink to="/admin/brands" icon={<Settings size={20} />} label="Marcas y Países" />
          )}
       </nav>

       <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)' }}>
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
      className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
    >
       {icon}
       {label}
    </NavLink>
  );
}
