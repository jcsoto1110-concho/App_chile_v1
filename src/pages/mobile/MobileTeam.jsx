import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Award, TrendingUp, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';

export default function MobileTeam() {
  const { profile } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchTeam() {
      if (!profile?.store_id) return;
      
      const { data: members } = await supabase
        .from('profiles')
        .select('id, full_name, role, current_xp, fitcoins, current_level')
        .eq('store_id', profile.store_id)
        .order('current_xp', { ascending: false });

      if (members) setTeam(members);
      setLoading(false);
    }
    fetchTeam();
  }, [profile]);

  const filteredTeam = team.filter(m => 
    m.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px 20px' }}>
      <div style={{ marginBottom: '24px' }}>
         <h1 style={{ fontSize: '1.5rem', margin: 0 }} className="text-gradient">Mi Equipo</h1>
         <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>Ranking de desempeño en tu tienda</p>
      </div>

      {/* Buscador Rápido */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Buscar colaborador..." 
            className="input-field" 
            style={{ paddingLeft: '40px', margin: 0, background: 'rgba(255,255,255,0.05)' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
         {loading ? (
             <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 size={32} className="animate-spin text-accent-primary" style={{ margin: '0 auto' }} /></div>
         ) : filteredTeam.length === 0 ? (
             <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No se encontraron colaboradores.</p>
         ) : (
             filteredTeam.map((member, i) => (
                <div key={member.id} style={{ 
                    background: 'rgba(0,0,0,0.4)', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '16px', 
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                   <div style={{ 
                       width: '32px', height: '32px', borderRadius: '50%', 
                       background: i === 0 ? 'var(--accent-warning)' : i === 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)', 
                       display: 'grid', placeItems: 'center', fontSize: '0.9rem', fontWeight: 'bold',
                       color: i === 0 ? '#000' : '#fff'
                   }}>
                      {i + 1}
                   </div>
                   
                   <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{member.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                         Lvl {member.current_level} • {member.role}
                      </div>
                   </div>

                   <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>{member.current_xp} XP</div>
                      <div style={{ color: 'var(--accent-warning)', fontSize: '0.75rem' }}>{member.fitcoins} FC</div>
                   </div>
                </div>
             ))
         )}
      </div>
    </div>
  );
}
