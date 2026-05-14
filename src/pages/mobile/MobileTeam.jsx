import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Award, TrendingUp, Search, Loader2, Bell, CheckCircle2, Circle, Zap, XCircle, X, ChevronRight, Target, Bot } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';

export default function MobileTeam() {
  const { profile } = useAuth();
  const [team, setTeam] = useState([]);
  const [allActiveChallenges, setAllActiveChallenges] = useState([]);
  const [allActiveSims, setAllActiveSims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);

  async function fetchTeamData() {
    if (!profile?.store_id) return;
    setLoading(true);
    
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Obtener TODOS los retos activos para la tienda
    const { data: activeChallenges } = await supabase.from('daily_challenges')
      .select('*')
      .or(`store_ids.is.null,store_ids.cs.{"${profile.store_id}"}`)
      .gte('end_date', today);
    setAllActiveChallenges(activeChallenges || []);

    // 2. Obtener TODAS las simulaciones activas
    const { data: activeSims } = await supabase.from('simulations')
      .select('*')
      .or(`store_ids.is.null,store_ids.cs.{"${profile.store_id}"}`)
      .gte('end_date', today);
    setAllActiveSims(activeSims || []);

    // 3. Obtener Colaboradores
    const { data: members } = await supabase
      .from('profiles')
      .select('id, full_name, role, current_xp, fitcoins, current_level')
      .eq('store_id', profile.store_id)
      .order('current_xp', { ascending: false });

    if (members) {
       // 4. Obtener todo el progreso de los miembros para esos retos/sims
       const { data: progress } = await supabase.from('user_progress')
         .select('user_id, challenge_id, score')
         .in('user_id', members.map(m => m.id));

       const { data: simProgress } = await supabase.from('user_simulation_progress')
          .select('user_id, simulation_id, score')
          .in('user_id', members.map(m => m.id));

       const enhancedTeam = members.map(m => {
          const mProgress = progress?.filter(p => p.user_id === m.id) || [];
          const mSimProgress = simProgress?.filter(sp => sp.user_id === m.id) || [];
          
          // Contar pendientes
          const pendingChallenges = activeChallenges?.filter(ac => !mProgress.some(p => p.challenge_id === ac.id)).length || 0;
          const pendingSims = activeSims?.filter(as => !mSimProgress.some(sp => sp.simulation_id === as.id)).length || 0;

          return {
             ...m,
             progress: mProgress,
             simProgress: mSimProgress,
             pendingCount: pendingChallenges + pendingSims,
             hasFailures: mProgress.some(p => p.score === 0)
          };
       });

       setTeam(enhancedTeam);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchTeamData();
  }, [profile]);

  const handleNudge = async (targetUserId, name) => {
     const { error } = await supabase.from('user_notifications').insert({
        user_id: targetUserId,
        manager_id: profile.id,
        message: `¡Hola ${name.split(' ')[0]}! Tu Jefe de Tienda te ha enviado un recordatorio: Tienes misiones pendientes por completar (Retos o Simulaciones IA).`,
        type: 'nudge'
     });

     if (!error) {
        alert(`🔔 Recordatorio enviado a ${name}. Recibirá el aviso al ingresar a la App.`);
     }
  };

  const filteredTeam = team.filter(m => 
    m.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px 20px', position: 'relative' }}>
      <div style={{ marginBottom: '24px' }}>
         <h1 style={{ fontSize: '1.5rem', margin: 0 }} className="text-gradient">Mi Equipo</h1>
         <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>Auditoría de cumplimiento en tiempo real</p>
      </div>

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
         ) : (
             filteredTeam.map((member, i) => (
                <div key={member.id} onClick={() => setSelectedMember(member)} style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '16px', 
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer'
                }}>
                   <div style={{ 
                       width: '40px', height: '40px', borderRadius: '12px', 
                       background: i === 0 ? 'var(--accent-warning)' : 'rgba(255,255,255,0.05)', 
                       display: 'grid', placeItems: 'center', fontWeight: 'bold',
                       color: i === 0 ? '#000' : '#fff'
                   }}>
                      {i + 1}
                   </div>
                   
                   <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{member.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                         {member.pendingCount > 0 ? (
                            <span style={{ color: 'var(--accent-warning)' }}>⚠️ {member.pendingCount} pendientes</span>
                         ) : (
                            <span style={{ color: '#00ff64' }}>✅ Al día</span>
                         )}
                         {member.hasFailures && <span style={{ color: 'var(--accent-danger)', marginLeft: '8px' }}>• Reprobó reto</span>}
                      </div>
                   </div>

                   <ChevronRight size={18} color="var(--text-muted)" />
                </div>
             ))
         )}
      </div>

      {/* MODAL DE DETALLE */}
      {selectedMember && (
         <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
            <div className="animate-slide-up" style={{ width: '100%', background: 'var(--bg-dark)', borderTopLeftRadius: '30px', borderTopRightRadius: '30px', padding: '32px 24px', maxHeight: '90%', overflowY: 'auto' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div>
                     <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{selectedMember.full_name}</h2>
                     <p className="text-muted" style={{ fontSize: '0.9rem' }}>{selectedMember.role} • Nivel {selectedMember.current_level}</p>
                  </div>
                  <button onClick={() => setSelectedMember(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px', borderRadius: '50%' }}>
                     <X size={20} />
                  </button>
               </div>

               <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                  <div style={{ flex: 1, background: 'rgba(0,240,255,0.1)', padding: '16px', borderRadius: '16px', textAlign: 'center' }}>
                     <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{selectedMember.current_xp}</div>
                     <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>XP Total</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,175,0,0.1)', padding: '16px', borderRadius: '16px', textAlign: 'center' }}>
                     <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-warning)' }}>{selectedMember.fitcoins}</div>
                     <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fitcoins</div>
                  </div>
               </div>

               <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={18} color="var(--accent-primary)" /> Misiones y Retos
               </h3>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                  {allActiveChallenges.map(ch => {
                     const prog = selectedMember.progress.find(p => p.challenge_id === ch.id);
                     return (
                        <div key={ch.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <span style={{ fontSize: '0.9rem' }}>{ch.title}</span>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {!prog ? (
                                 <span style={{ fontSize: '0.75rem', color: 'var(--accent-warning)' }}>Pendiente</span>
                              ) : prog.score === 0 ? (
                                 <span style={{ fontSize: '0.75rem', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={14}/> Reprobó</span>
                              ) : (
                                 <span style={{ fontSize: '0.75rem', color: '#00ff64', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14}/> Aprobó</span>
                              )}
                           </div>
                        </div>
                     )
                  })}
                  {allActiveSims.map(sim => {
                     const sprog = selectedMember.simProgress.find(sp => sp.simulation_id === sim.id);
                     return (
                        <div key={sim.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Bot size={14}/> {sim.title}</span>
                           {!sprog ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--accent-warning)' }}>Sin iniciar</span>
                           ) : (
                              <span style={{ fontSize: '0.75rem', color: '#00ff64', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14}/> Realizado</span>
                           )}
                        </div>
                     )
                  })}
               </div>

               {selectedMember.pendingCount > 0 && (
                  <button 
                     onClick={() => { handleNudge(selectedMember.id, selectedMember.full_name); setSelectedMember(null); }}
                     className="btn-primary" 
                     style={{ width: '100%', justifyContent: 'center', gap: '10px', height: '54px', fontSize: '1rem' }}
                  >
                     <Bell size={20} /> Enviar Recordatorio
                  </button>
               )}
            </div>
         </div>
      )}
    </div>
  );
}
v>
  );
}
