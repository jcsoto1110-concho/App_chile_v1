import React from 'react';
import { Award, Zap, Flame, User, LogOut } from 'lucide-react';

import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';

export default function MobileProfile() {
  const { profile } = useAuth();
  if (!profile) return null;

  return (
    <div className="animate-fade-in" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', flex: 1 }}>
       
       {/* Top: Info User */}
       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: '20px' }}>
           <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #00f0ff, #7000ff)', display: 'grid', placeItems: 'center', marginBottom: '16px' }}>
                <User size={40} color="#000" />
           </div>
           <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{profile.full_name}</h1>
           <span className="badge primary" style={{ marginBottom: '16px', textTransform: 'capitalize' }}>{profile.role} - Lv. {profile.current_level}</span>
           <p className="text-muted" style={{ fontSize: '0.9rem' }}>Sede: {profile.stores?.name || 'Local Central'}</p>
       </div>

       {/* Stats Cards */}
       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
           <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '16px', textAlign: 'center' }}>
               <Zap size={24} color="var(--accent-primary)" style={{ margin: '0 auto 8px auto' }} />
               <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{profile.current_xp}</div>
               <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>XP Total</div>
           </div>
           <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '16px', textAlign: 'center' }}>
               <Flame size={24} color="var(--accent-warning)" style={{ margin: '0 auto 8px auto' }} />
               <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>14</div>
               <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Días Seguídos</div>
           </div>
       </div>

       {/* Leaderboard Preview */}
       <div>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
               <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Liga Tienda</h2>
               <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}>Ver Todo</span>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '16px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <span style={{ fontWeight: 800, color: '#FFD700' }}>1</span>
                       <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#333' }}></div>
                       <span>Javier Ruiz</span>
                   </div>
                   <span style={{ fontWeight: 800 }}>1,200 <span style={{ fontSize:'0.7rem', color:'var(--text-muted)'}}>xp</span></span>
               </div>
               
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid var(--accent-primary)', padding: '12px 16px', borderRadius: '16px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <span style={{ fontWeight: 800, color: '#C0C0C0' }}>2</span>
                       <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #00f0ff, #7000ff)' }}></div>
                       <span style={{ fontWeight: 800 }}>Tú</span>
                   </div>
                   <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>{profile.current_xp} <span style={{ fontSize:'0.7rem', color:'var(--text-muted)'}}>xp</span></span>
               </div>
           </div>
       </div>

       {/* Botón de Cerrar Sesión */}
       <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
           <button 
             onClick={async () => { await supabase.auth.signOut(); localStorage.removeItem('custom_session'); window.location.href = '/'; }} 
             className="btn-secondary" 
             style={{ width: '100%', justifyContent: 'center', borderColor: 'rgba(255,50,50,0.3)', color: 'var(--accent-danger)' }}
           >
              <LogOut size={18} /> Cerrar Sesión
           </button>
       </div>

    </div>
  );
}
