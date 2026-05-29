import React, { useState, useEffect } from 'react';
import { Award, Zap, Flame, User, LogOut } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';

export default function MobileProfile() {
  const { profile } = useAuth();
  const [league, setLeague] = useState([]);
  const [localXp, setLocalXp] = useState(null);

  useEffect(() => {
    if (!profile?.id || !profile?.store_id) return;

    async function fetchLeague() {
      // Traer XP actualizado del usuario
      const { data: fresh } = await supabase
        .from('profiles').select('current_xp, fitcoins').eq('id', profile.id).single();
      if (fresh) setLocalXp(fresh.current_xp ?? 0);

      // Ranking de la misma tienda ordenado por XP
      const { data: peers } = await supabase
        .from('profiles')
        .select('id, full_name, current_xp')
        .eq('store_id', profile.store_id)
        .order('current_xp', { ascending: false })
        .limit(10);

      if (peers) setLeague(peers);
    }

    fetchLeague();
  }, [profile]);

  if (!profile) return null;

  const displayXp = localXp !== null ? localXp : (profile.current_xp || 0);

  return (
    <div className="animate-fade-in" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', flex: 1 }}>
       
       {/* Top: Info User */}
       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: '20px' }}>
           <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'grid', placeItems: 'center', marginBottom: '16px', boxShadow: '0 8px 24px rgba(0,72,130,0.2)' }}>
                <User size={40} color="#fff" />
           </div>
           <h1 style={{ fontSize: '1.5rem', marginBottom: '4px', color: 'var(--text-main)' }}>{profile.full_name}</h1>
           <span className="badge primary" style={{ marginBottom: '16px', textTransform: 'capitalize' }}>{profile.role} - Lv. {profile.current_level}</span>
           <p className="text-muted" style={{ fontSize: '0.9rem' }}>Sede: {profile.stores?.name || 'Local Central'}</p>
       </div>

       {/* Stats Cards */}
       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
           <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '20px', padding: '16px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
               <Zap size={24} color="var(--accent-primary)" style={{ margin: '0 auto 8px auto' }} />
               <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{displayXp}</div>
               <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>XP Total</div>
           </div>
           <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '20px', padding: '16px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
               <Flame size={24} color="var(--accent-warning)" style={{ margin: '0 auto 8px auto' }} />
               <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{profile.streak_days || 0}</div>
               <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Días Seguidos</div>
           </div>
       </div>

       {/* Leaderboard - Dinámico desde Supabase */}
       <div>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
               <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-main)' }}>Liga Tienda</h2>
               <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 700 }}>Top {league.length}</span>
           </div>

           {league.length === 0 ? (
             <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>
               Aún no hay compañeros en tu tienda.
             </p>
           ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
               {league.map((peer, i) => {
                 const isMe = peer.id === profile.id;
                 const medal = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--text-muted)';
                 return (
                   <div
                     key={peer.id}
                     style={{
                       display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                       background: isMe ? 'var(--accent-primary)' : 'var(--bg-card)',
                       border: isMe ? 'none' : '1px solid rgba(0,0,0,0.05)',
                       padding: '12px 16px', borderRadius: '16px',
                       boxShadow: isMe ? '0 8px 20px rgba(0,72,130,0.2)' : '0 2px 10px rgba(0,0,0,0.02)'
                     }}
                   >
                     <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <span style={{ fontWeight: 800, color: isMe ? '#fff' : medal, minWidth: '20px' }}>{i + 1}</span>
                       <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isMe ? 'rgba(255,255,255,0.2)' : 'var(--bg-dark)', display: 'grid', placeItems: 'center' }}>
                         <User size={16} color={isMe ? '#fff' : 'var(--text-muted)'} />
                       </div>
                       <span style={{ fontWeight: isMe ? 800 : 600, color: isMe ? '#fff' : 'var(--text-main)' }}>
                         {isMe ? 'Tú' : peer.full_name}
                       </span>
                     </div>
                     <span style={{ fontWeight: 800, color: isMe ? '#fff' : 'var(--text-main)' }}>
                       {isMe ? displayXp : (peer.current_xp || 0)} <span style={{ fontSize: '0.7rem', color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>xp</span>
                     </span>
                   </div>
                 );
               })}
             </div>
           )}
       </div>

       {/* Botón de Cerrar Sesión */}
       <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
           <button
             onClick={async () => { await supabase.auth.signOut(); localStorage.removeItem('custom_session'); window.location.href = '/'; }}
             className="btn-secondary"
             style={{ width: '100%', justifyContent: 'center', borderColor: 'rgba(204,0,0,0.2)', color: 'var(--accent-danger)', background: 'rgba(204,0,0,0.05)' }}
           >
              <LogOut size={18} /> Cerrar Sesión
           </button>
       </div>

    </div>
  );
}
