import React, { useState, useEffect } from 'react';
import { Store, Users, Award, Target, Loader2, ChevronRight, Search, Bell, CheckCircle2, Circle, Zap, XCircle, X, Bot } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export default function StoreDetail() {
  const { profile, isSuperAdmin } = useAuth();
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [collaborators, setCollaborators] = useState([]);
  const [allActiveChallenges, setAllActiveChallenges] = useState([]);
  const [allActiveSims, setAllActiveSims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingColabs, setFetchingColabs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    async function fetchStores() {
      let query = supabase.from('stores').select('*').order('name');
      if (!isSuperAdmin && profile?.brand_id) {
        query = query.eq('brand_id', profile.brand_id);
      }
      const { data, error } = await query;
      if (!error && data) {
        setStores(data);
        if (data.length > 0) {
          setSelectedStoreId(data[0].id);
        }
      }
      setLoading(false);
    }
    fetchStores();
  }, [profile, isSuperAdmin]);

  useEffect(() => {
    if (selectedStoreId) {
      fetchCollaborators();
    }
  }, [selectedStoreId]);

  async function fetchCollaborators() {
    setFetchingColabs(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Obtener TODOS los retos activos para la tienda
      let chalQuery = supabase.from('daily_challenges')
        .select('*')
        .or(`store_ids.is.null,store_ids.cs.{"${selectedStoreId}"}`)
        .gte('end_date', today);
      if (!isSuperAdmin && profile?.brand_id) {
        chalQuery = chalQuery.eq('brand_id', profile.brand_id);
      }
      const { data: activeChallenges } = await chalQuery;
      setAllActiveChallenges(activeChallenges || []);

      // 2. Obtener TODAS las simulaciones activas
      let simsQuery = supabase.from('simulations')
        .select('*')
        .or(`store_ids.is.null,store_ids.cs.{"${selectedStoreId}"}`)
        .gte('end_date', today);
      if (!isSuperAdmin && profile?.brand_id) {
        simsQuery = simsQuery.eq('brand_id', profile.brand_id);
      }
      const { data: activeSims } = await simsQuery;
      setAllActiveSims(activeSims || []);

      // 3. Obtenemos perfiles de la tienda
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('store_id', selectedStoreId);

      if (profError) throw profError;
      
      const profileIds = (profiles || []).map(p => p.id);

      let progress = [];
      let simProgress = [];

      if (profileIds.length > 0) {
        const { data: pData } = await supabase
          .from('user_progress')
          .select('user_id, challenge_id, score')
          .in('user_id', profileIds);
        if (pData) progress = pData;

        const { data: spData } = await supabase
          .from('user_simulation_progress')
          .select('user_id, simulation_id, score')
          .in('user_id', profileIds);
        if (spData) simProgress = spData;
      }

      const enriched = (profiles || []).map(p => {
        const mProgress = progress.filter(pr => pr.user_id === p.id);
        const mSimProgress = simProgress.filter(sp => sp.user_id === p.id);
        
        const pendingChallenges = (activeChallenges || []).filter(ac => !mProgress.some(pr => pr.challenge_id === ac.id)).length;
        const pendingSims = (activeSims || []).filter(as => !mSimProgress.some(sp => sp.simulation_id === as.id)).length;

        return {
          ...p,
          progress: mProgress,
          simProgress: mSimProgress,
          pendingCount: pendingChallenges + pendingSims,
          completedChallenges: mProgress.length,
          hasFailures: mProgress.some(pr => pr.score === 0)
        }
      }).sort((a, b) => (b.current_xp + b.fitcoins) - (a.current_xp + a.fitcoins));

      setCollaborators(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingColabs(false);
    }
  }

  const handleNudge = async (targetUserId, name, customMsg = null) => {
     const defaultMsg = `¡Hola ${name.split(' ')[0]}! Tu Administrador te ha enviado un recordatorio: Tienes misiones pendientes por completar.`;
     
     const { error } = await supabase.from('user_notifications').insert({
        user_id: targetUserId,
        manager_id: profile.id,
        message: customMsg || defaultMsg,
        type: 'nudge'
     });

     if (!error) {
        alert(`🔔 Recordatorio enviado a ${name}. Recibirá el aviso en su app móvil.`);
     }
  };

  const filteredColabs = collaborators.filter(c => 
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '60vh' }}><Loader2 className="animate-spin" size={40} color="var(--accent-primary)" /></div>;
  }

  const selectedStore = stores.find(s => s.id === selectedStoreId);

  return (
    <div className="animate-fade-in" style={{ position: 'relative' }}>
      <div className="header-action">
        <div>
          <h1 className="text-gradient">Detalle por Tienda</h1>
          <p className="text-muted" style={{ marginTop: '4px' }}>Visualiza el progreso y audita el cumplimiento (Haz clic en un colaborador)</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <label className="input-label">Seleccionar Tienda / Sucursal</label>
          <div style={{ position: 'relative' }}>
            <Store size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
            <select 
              className="input-field" 
              style={{ paddingLeft: '40px', width: '100%' }}
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
            >
              {stores.map(s => <option key={s.id} value={s.id}>{s.name} - {s.location}</option>)}
            </select>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '250px' }}>
          <label className="input-label">Buscar Colaborador</label>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input-field" 
              style={{ paddingLeft: '40px', width: '100%' }}
              placeholder="Nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {fetchingColabs ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="animate-spin" size={32} color="var(--accent-primary)" /></div>
      ) : (
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Equipo: {selectedStore?.name}</h2>
            <span className="badge primary">{filteredColabs.length} Colaboradores</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)', textAlign: 'left' }}>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>COLABORADOR</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>ESTADO</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>DESEMPEÑO</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>NIVEL</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'right' }}>ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {filteredColabs.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron colaboradores para esta tienda.</td></tr>
                ) : filteredColabs.map((colab, idx) => (
                  <tr key={colab.id} onClick={() => setSelectedMember(colab)} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s', cursor: 'pointer' }} className="hover-row">
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', display: 'grid', placeItems: 'center', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                          {colab.full_name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{colab.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{colab.role}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      {colab.pendingCount > 0 ? (
                        <span style={{ color: 'var(--accent-warning)', fontSize: '0.85rem' }}>⚠️ {colab.pendingCount} pendientes</span>
                      ) : (
                        <span style={{ color: '#00ff64', fontSize: '0.85rem' }}>✅ Al día</span>
                      )}
                      {colab.hasFailures && <div style={{ color: 'var(--accent-danger)', fontSize: '0.75rem', marginTop: '4px' }}>• Reprobó reto</div>}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-warning)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                          <Award size={14} /> {colab.fitcoins || 0}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                          <TrendingUpIcon size={14} /> {colab.current_xp || 0}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                       <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-dark)', display: 'grid', placeItems: 'center', fontWeight: 'bold', border: '1px solid var(--accent-secondary)', color: 'var(--accent-secondary)' }}>
                          {colab.current_level || 1}
                       </div>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                       <ChevronRight size={20} color="var(--text-muted)" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLE (SUPERVISOR VIEW) */}
      {selectedMember && (
         <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="animate-slide-up" style={{ width: '100%', maxWidth: '600px', background: 'var(--bg-dark)', borderRadius: '24px', padding: '32px 24px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--glass-border)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div>
                     <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{selectedMember.full_name}</h2>
                     <p className="text-muted" style={{ fontSize: '0.9rem' }}>{selectedMember.email} • {selectedMember.role} • Nivel {selectedMember.current_level}</p>
                  </div>
                  <button onClick={() => setSelectedMember(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}>
                     <X size={20} />
                  </button>
               </div>

               <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                  <div style={{ flex: 1, background: 'rgba(0,240,255,0.1)', padding: '16px', borderRadius: '16px', textAlign: 'center' }}>
                     <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{selectedMember.current_xp}</div>
                     <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>XP Total</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,175,0,0.1)', padding: '16px', borderRadius: '16px', textAlign: 'center' }}>
                     <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--accent-warning)' }}>{selectedMember.fitcoins}</div>
                     <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fitcoins</div>
                  </div>
               </div>

               <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={20} color="var(--accent-primary)" /> Misiones y Retos
               </h3>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                  {allActiveChallenges.map(ch => {
                     const prog = selectedMember.progress.find(p => p.challenge_id === ch.id);
                     return (
                        <div key={ch.id} 
                           onClick={() => {
                              if (!prog || prog.score === 0) {
                                 const msg = prompt(`Escribe un feedback para ${selectedMember.full_name.split(' ')[0]} sobre "${ch.title}":`, !prog ? 'Te falta completar este reto.' : 'Reprobaste el reto, ¡haz un mayor esfuerzo la próxima vez!');
                                 if (msg) handleNudge(selectedMember.id, selectedMember.full_name, msg);
                              }
                           }}
                           style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', padding: '14px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: (!prog || prog.score === 0) ? 'pointer' : 'default' }}>
                           <span style={{ fontSize: '0.95rem' }}>{ch.title}</span>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {!prog ? (
                                 <span style={{ fontSize: '0.8rem', color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>Pendiente <Bell size={14}/></span>
                              ) : prog.score === 0 ? (
                                 <span style={{ fontSize: '0.8rem', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={16}/> Reprobó <Bell size={14}/></span>
                              ) : (
                                 <span style={{ fontSize: '0.8rem', color: '#00ff64', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={16}/> Aprobó</span>
                              )}
                           </div>
                        </div>
                     )
                  })}
                  {allActiveSims.map(sim => {
                     const sprog = selectedMember.simProgress.find(sp => sp.simulation_id === sim.id);
                     return (
                        <div key={sim.id} 
                           onClick={() => {
                              if (!sprog) {
                                 const msg = prompt(`Escribe un recordatorio para ${selectedMember.full_name.split(' ')[0]} sobre "${sim.title}":`, 'Te falta realizar esta simulación IA.');
                                 if (msg) handleNudge(selectedMember.id, selectedMember.full_name, msg);
                              }
                           }}
                           style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', padding: '14px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: !sprog ? 'pointer' : 'default' }}>
                           <span style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Bot size={16} color="var(--accent-primary)"/> {sim.title}</span>
                           {!sprog ? (
                              <span style={{ fontSize: '0.8rem', color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>Sin iniciar <Bell size={14}/></span>
                           ) : (
                              <span style={{ fontSize: '0.8rem', color: '#00ff64', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={16}/> Realizado</span>
                           )}
                        </div>
                     )
                  })}
               </div>

               {selectedMember.pendingCount > 0 && (
                  <button 
                     onClick={() => { handleNudge(selectedMember.id, selectedMember.full_name); setSelectedMember(null); }}
                     className="btn-primary" 
                     style={{ width: '100%', justifyContent: 'center', gap: '10px', height: '54px', fontSize: '1rem', background: 'linear-gradient(135deg, #ffb800, #ff0055)' }}
                  >
                     <Bell size={20} /> Enviar Recordatorio General
                  </button>
               )}
            </div>
         </div>
      )}

      <style>{`
        .hover-row:hover { background: rgba(255,255,255,0.05); }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function TrendingUpIcon({size, color}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
}
