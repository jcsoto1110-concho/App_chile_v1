import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Award, TrendingUp, Search, Loader2, Bell, CheckCircle2, Circle, Zap, XCircle } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';

export default function MobileTeam() {
  const { profile } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [todayChallenge, setTodayChallenge] = useState(null);

  useEffect(() => {
    async function fetchTeam() {
      if (!profile?.store_id) return;
      
      const today = new Date().toISOString().split('T')[0];
      
      // 1. Obtener Reto de Hoy
      const { data: chals } = await supabase.from('daily_challenges')
        .select('id, title').eq('active_date', today).limit(1);
      if (chals && chals[0]) setTodayChallenge(chals[0]);

      // 2. Obtener Colaboradores
      const { data: members } = await supabase
        .from('profiles')
        .select('id, full_name, role, current_xp, fitcoins, current_level')
        .eq('store_id', profile.store_id)
        .order('current_xp', { ascending: false });

      if (members) {
         // 3. Obtener progreso de hoy para todos
         const { data: progress } = await supabase.from('user_progress')
           .select('user_id, challenge_id')
           .in('user_id', members.map(m => m.id))
           .eq('challenge_id', chals?.[0]?.id || '00000000-0000-0000-0000-000000000000');

         // 4. Obtener progreso de simulaciones
         const { data: simProgress } = await supabase.from('user_simulation_progress')
            .select('user_id')
            .in('user_id', members.map(m => m.id));

         const enhancedTeam = members.map(m => {
            const prog = progress?.find(p => p.user_id === m.id);
            return {
               ...m,
               hasDoneChallenge: !!prog,
               challengeScore: prog ? prog.score : null,
               hasDoneSimulation: simProgress?.some(sp => sp.user_id === m.id)
            };
         });

         setTeam(enhancedTeam);
      }
      setLoading(false);
    }
    fetchTeam();
  }, [profile]);

  const handleNudge = async (targetUserId, name) => {
     const { error } = await supabase.from('user_notifications').insert({
        user_id: targetUserId,
        manager_id: profile.id,
        message: `¡Hola ${name.split(' ')[0]}! Tu Jefe de Tienda te ha enviado un recordatorio: Tienes misiones pendientes por completar (Retos o Simulaciones IA). ¡A por ello!`,
        type: 'nudge'
     });

     if (!error) {
        alert(`🔔 Recordatorio enviado a ${name}. Recibirá el aviso al ingresar a la App.`);
     } else {
        alert('Error al enviar recordatorio: ' + error.message);
     }
  };

  const filteredTeam = team.filter(m => 
    m.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px 20px' }}>
      <div style={{ marginBottom: '24px' }}>
         <h1 style={{ fontSize: '1.5rem', margin: 0 }} className="text-gradient">Mi Equipo</h1>
         <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>Control de cumplimiento por sucursal</p>
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

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
         {loading ? (
             <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 size={32} className="animate-spin text-accent-primary" style={{ margin: '0 auto' }} /></div>
         ) : filteredTeam.length === 0 ? (
             <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No se encontraron colaboradores.</p>
         ) : (
             filteredTeam.map((member, i) => (
                <div key={member.id} style={{ 
                    background: 'rgba(0,0,0,0.4)', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '20px', 
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ 
                          width: '36px', height: '36px', borderRadius: '10px', 
                          background: i === 0 ? 'var(--accent-warning)' : 'rgba(255,255,255,0.05)', 
                          display: 'grid', placeItems: 'center', fontSize: '1rem', fontWeight: 'bold',
                          color: i === 0 ? '#000' : '#fff'
                      }}>
                         {i + 1}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                         <div style={{ fontWeight: 700, fontSize: '1rem' }}>{member.full_name}</div>
                         <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                            {member.role} • Lvl {member.current_level}
                         </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                         <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>{member.current_xp} XP</div>
                         <div style={{ color: 'var(--accent-warning)', fontSize: '0.75rem' }}>{member.fitcoins} FC</div>
                      </div>
                   </div>

                   {/* Estados de Tareas */}
                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                       <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {member.hasDoneChallenge ? (
                             member.challengeScore === 0 ? <XCircle size={14} color="#ff3232" /> : <CheckCircle2 size={14} color="#00ff64" />
                          ) : <Circle size={14} color="var(--text-muted)" />}
                          <span style={{ fontSize: '0.75rem', color: member.hasDoneChallenge ? '#fff' : 'var(--text-muted)' }}>
                             Reto {member.hasDoneChallenge ? (member.challengeScore === 0 ? '(Reprobó)' : '(Aprobó)') : ''}
                          </span>
                       </div>
                       <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {member.hasDoneSimulation ? <CheckCircle2 size={14} color="#00ff64" /> : <Circle size={14} color="var(--text-muted)" />}
                          <span style={{ fontSize: '0.75rem', color: member.hasDoneSimulation ? '#fff' : 'var(--text-muted)' }}>Simulador IA</span>
                       </div>
                       
                       {( !member.hasDoneChallenge || !member.hasDoneSimulation || member.challengeScore === 0 ) && (
                          <button 
                            onClick={() => handleNudge(member.id, member.full_name)}
                            style={{ background: member.challengeScore === 0 ? 'var(--accent-danger)' : 'var(--accent-primary)', border: 'none', color: member.challengeScore === 0 ? '#fff' : '#000', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                             <Bell size={16} />
                          </button>
                       )}
                    </div>
                </div>
             ))
         )}
      </div>
    </div>
  );
}
