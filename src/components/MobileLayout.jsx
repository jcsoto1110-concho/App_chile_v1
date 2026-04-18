import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, MessageSquare, User } from 'lucide-react';

export default function MobileLayout() {
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
