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
               <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{displayXp}</div>
               <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>XP Total</div>
           </div>
           <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '16px', textAlign: 'center' }}>
               <Flame size={24} color="var(--accent-warning)" style={{ margin: '0 auto 8px auto' }} />
               <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{profile.streak_days || 0}</div>
               <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Días Seguidos</div>
           </div>
       </div>

       {/* Leaderboard - Dinámico desde Supabase */}
       <div>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
               <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Liga Tienda</h2>
               <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}>Top {league.length}</span>
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
                       background: isMe ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255,255,255,0.05)',
                       border: isMe ? '1px solid var(--accent-primary)' : 'none',
                       padding: '12px 16px', borderRadius: '16px'
                     }}
                   >
                     <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <span style={{ fontWeight: 800, color: medal, minWidth: '20px' }}>{i + 1}</span>
                       <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isMe ? 'linear-gradient(135deg, #00f0ff, #7000ff)' : '#333', display: 'grid', placeItems: 'center' }}>
                         {isMe && <User size={16} color="#000" />}
                       </div>
                       <span style={{ fontWeight: isMe ? 800 : 400 }}>
                         {isMe ? 'Tú' : peer.full_name}
                       </span>
                     </div>
                     <span style={{ fontWeight: 800, color: isMe ? 'var(--accent-primary)' : '#fff' }}>
                       {isMe ? displayXp : (peer.current_xp || 0)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>xp</span>
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
             style={{ width: '100%', justifyContent: 'center', borderColor: 'rgba(255,50,50,0.3)', color: 'var(--accent-danger)' }}
           >
              <LogOut size={18} /> Cerrar Sesión
           </button>
       </div>

    </div>
  );
}
