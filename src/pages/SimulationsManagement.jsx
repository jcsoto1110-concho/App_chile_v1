import React, { useState, useEffect } from 'react';
import { Plus, Bot, Target, Sparkles, X, Loader2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateSimulationScenario } from '../lib/ai';
import { getRoles } from '../lib/rolesConfig';

export default function SimulationsManagement() {
  const [simulations, setSimulations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [stores, setStores] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ideaPrompt, setIdeaPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSim, setGeneratedSim] = useState(null);
  const [errorObj, setErrorObj] = useState(null);

  const todayRaw = new Date().toISOString().split('T')[0];
  const [dates, setDates] = useState({ 
    active_date: todayRaw, 
    end_date: todayRaw,
    role_targets: [],
    store_ids: []
  });

  async function fetchSimulations() {
    setLoadingList(true);
    const { data, error } = await supabase.from('simulations').select('*').order('active_date', { ascending: false });
    if (!error && data) {
       setSimulations(data);
    }
    setLoadingList(false);
  }

  useEffect(() => {
    fetchSimulations();
    setRoles(getRoles());
    async function fetchStores() {
       const { data } = await supabase.from('stores').select('*').order('name');
       if (data) setStores(data);
    }
    fetchStores();

    // Cargar persistencia
    const savedPrompt = localStorage.getItem('pending_sim_prompt');
    const savedSim = localStorage.getItem('pending_sim_generated');
    const savedDates = localStorage.getItem('pending_sim_dates');

    if (savedPrompt) setIdeaPrompt(savedPrompt);
    if (savedSim) {
       setGeneratedSim(JSON.parse(savedSim));
       setIsModalOpen(true);
    }
    if (savedDates) setDates(JSON.parse(savedDates));
  }, []);

  // Guardar persistencia automáticamente
  useEffect(() => {
     if (ideaPrompt) localStorage.setItem('pending_sim_prompt', ideaPrompt);
     if (generatedSim) localStorage.setItem('pending_sim_generated', JSON.stringify(generatedSim));
     if (dates) localStorage.setItem('pending_sim_dates', JSON.stringify(dates));
  }, [ideaPrompt, generatedSim, dates]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!ideaPrompt) return;
    
    setIsGenerating(true);
    setErrorObj(null);
    try {
      const data = await generateSimulationScenario(ideaPrompt);
      setGeneratedSim(data);
    } catch (err) {
      setErrorObj(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveSimulation = async () => {
    setIsGenerating(true); // Reusamos el estado de carga para el botón de guardado
    
    const { error } = await supabase.from('simulations').insert({
      title: generatedSim.title,
      scenario_description: ideaPrompt,
      role_target: dates.role_targets.length > 0 ? dates.role_targets : (generatedSim.role ? [generatedSim.role.toLowerCase()] : null),
      store_ids: dates.store_ids.length > 0 ? dates.store_ids : null,
      ai_persona: generatedSim.persona,
      evaluation_criteria: generatedSim.evaluation_criteria_arr,
      reward_xp: generatedSim.xp,
      active_date: dates.active_date,
      end_date: dates.end_date
    });
    
    setIsGenerating(false);
    
    if (!error) {
        setIsModalOpen(false);
        setIdeaPrompt("");
        setGeneratedSim(null);
        setDates({ active_date: todayRaw, end_date: todayRaw, role_targets: [], store_ids: [] });
        
        // Limpiar persistencia
        localStorage.removeItem('pending_sim_prompt');
        localStorage.removeItem('pending_sim_generated');
        localStorage.removeItem('pending_sim_dates');
        
        fetchSimulations(); // Recargamos grid
    } else {
       setErrorObj(error.message);
    }
  };

  return (
    <>
      <div className="animate-fade-in relative">
        <div className="header-action">
        <div>
          <h1 className="text-gradient">Simulador Inteligente</h1>
          <p className="text-muted" style={{ marginTop: '4px' }}>Crea escenarios de roleplay avanzados con OpenAI</p>
        </div>
        <button onClick={() => { setIsModalOpen(true); setGeneratedSim(null); setIdeaPrompt(''); setErrorObj(null); }} className="btn-primary" style={{ background: 'linear-gradient(135deg, #00f0ff, #ff0055)' }}>
          <Sparkles size={18} /> Crear con IA
        </button>
      </div>

      {loadingList ? (
         <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Loader2 className="animate-spin text-accent-primary" size={32} style={{ margin: '0 auto 12px auto', animation: 'spin 1s linear infinite' }} />
              <p>Buscando escenarios almacenados en la nube...</p>
         </div>
      ) : (() => {
        const todayRaw = new Date().toISOString().split('T')[0];
        const active = simulations.filter(s => !s.end_date || s.end_date >= todayRaw);
        const expired = simulations.filter(s => s.end_date && s.end_date < todayRaw);
        return (
          <>
            {active.length === 0 ? (
               <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <Bot size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
                    <p>No hay simulaciones activas. ¡Crea la primera con Inteligencia Artificial!</p>
               </div>
            ) : (
              <div className="grid grid-2">
                 {active.map(sim => (
                     <div key={sim.id} className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '40px', height: '40px', background: 'rgba(112, 0, 255, 0.2)', borderRadius: '12px', display: 'grid', placeItems: 'center' }}>
                                 <Bot size={24} color="var(--accent-secondary)"/>
                              </div>
                              <div>
                                 <h3 style={{ fontSize: '1.2rem' }}>{sim.title}</h3>
                                 <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '2px' }}>Rol: {sim.role_target}</p>
                              </div>
                           </div>
                           {sim.end_date && <span style={{ fontSize: '0.75rem', color: 'var(--accent-warning)', background: 'rgba(255,200,0,0.1)', padding: '4px 8px', borderRadius: '8px', whiteSpace: 'nowrap' }}>Vence: {sim.end_date}</span>}
                        </div>

                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                           <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Actitud del Cliente IA:</div>
                           <div style={{ fontWeight: 600 }}>{sim.ai_persona}</div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                           <div>
                             <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Criterios a Evaluar:</div>
                             <ul style={{ fontSize: '0.85rem', color: 'var(--text-main)', paddingLeft: '16px', margin: 0 }}>
                               {(sim.evaluation_criteria || []).map((c, i) => <li key={i}>{c}</li>)}
                             </ul>
                           </div>
                           <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <Target size={16} color="var(--accent-primary)"/>
                              <span style={{ fontSize: '0.9rem' }}><strong style={{ color: 'var(--accent-primary)' }}>{sim.reward_xp} XP</strong></span>
                           </div>
                        </div>
                     </div>
                 ))}
              </div>
            )}

            {/* HISTÓRICO */}
            {expired.length > 0 && (
              <div style={{ marginTop: '40px' }}>
                <button onClick={() => setShowHistory(h => !h)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  {showHistory ? '▲' : '▼'} Histórico Vencido ({expired.length} simulaciones)
                </button>
                {showHistory && (
                  <div className="grid grid-2" style={{ opacity: 0.5 }}>
                    {expired.map(sim => (
                      <div key={sim.id} className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(255,0,0,0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h3 style={{ fontSize: '1rem' }}>{sim.title}</h3>
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-danger)', background: 'rgba(255,0,0,0.1)', padding: '4px 8px', borderRadius: '8px' }}>Vencido: {sim.end_date}</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{sim.role_target} · {sim.reward_xp} XP</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}

      </div>

      {/* Modal / Panel Superpuesto Generador IA */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 100,
          display: 'grid', placeItems: 'center', padding: '16px'
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '600px', background: 'var(--bg-dark)', padding: 0, overflow: 'hidden' }}>
             
             {/* Header */}
             <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <Bot color="var(--accent-primary)" /> Forjar Escenario
                </h2>
                <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <X />
                </button>
             </div>

             {/* Body */}
             <div style={{ padding: '24px' }}>
                {!generatedSim ? (
                  <form onSubmit={handleGenerate}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                      Escribe la idea. La IA se encargará de crear el rol, el puntaje y los criterios de evaluación.
                    </p>
                    <div className="input-group">
                       <input 
                         type="text" 
                         className="input-field" 
                         value={ideaPrompt}
                         onChange={(e)=>setIdeaPrompt(e.target.value)}
                         placeholder="Ej: Turista ruso entra buscando guantes de trekking para la nieve..." 
                         required
                         autoFocus
                       />
                    </div>
                    {errorObj && <p style={{ color: 'var(--accent-danger)', marginBottom: '16px', fontSize: '0.9rem' }}>{errorObj}</p>}
                    
                    <button type="submit" className="btn-primary" disabled={isGenerating} style={{ width: '100%' }}>
                      {isGenerating ? <Loader2 className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={18}/>}
                      {isGenerating ? ' Procesando en OpenAI...' : ' Generar con IA'}
                    </button>
                  </form>
                ) : (
                  <div className="animate-fade-in">
                    <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-primary)', marginBottom: '8px' }}>{generatedSim.title}</h3>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                       <span className="badge warning">
                          Rol: {dates.role_targets.length === 0 ? 'Todas las áreas' : (dates.role_targets.length > 1 ? 'Multiperfil' : roles.find(r=>r.name===dates.role_targets[0])?.label || dates.role_targets[0])}
                       </span>
                       <span className="badge primary">{generatedSim.xp} XP Recompensa</span>
                    </div>

                    <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                       <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Arquetipo Persona:</strong>
                       <p>{generatedSim.persona}</p>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                       <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Métricas de Evaluación:</strong>
                       <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                         {generatedSim.evaluation_criteria_arr?.map((c, i) => (
                           <li key={i}>{c}</li>
                         ))}
                       </ul>
                    </div>

                    {/* SECCIÓN FECHAS Y SEGMENTACIÓN (NUEVA) */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)', marginBottom: '24px' }}>
                       
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                          <div className="input-group" style={{ margin: 0 }}>
                             <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fecha Inicio</label>
                             <input type="date" className="input-field" value={dates.active_date} onChange={e => setDates({...dates, active_date: e.target.value})} />
                          </div>
                          <div className="input-group" style={{ margin: 0 }}>
                             <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fecha Cierre</label>
                             <input type="date" className="input-field" min={dates.active_date} value={dates.end_date} onChange={e => setDates({...dates, end_date: e.target.value})} required/>
                          </div>
                       </div>

                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                             <label className="input-label" style={{ fontSize: '0.75rem', marginBottom: '8px', display: 'block' }}>Público (Opcional)</label>
                             <div style={{ maxHeight: '120px', overflowY: 'auto', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>
                                   <input 
                                      type="checkbox" 
                                      checked={dates.role_targets.length === 0}
                                      onChange={() => setDates({...dates, role_targets: []})}
                                   /> Todas
                                </label>
                                {roles.map(role => (
                                   <label key={role.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>
                                      <input 
                                         type="checkbox" 
                                         checked={dates.role_targets.includes(role.name)}
                                         onChange={() => {
                                            const newR = dates.role_targets.includes(role.name)
                                               ? dates.role_targets.filter(r => r !== role.name)
                                               : [...dates.role_targets, role.name];
                                            setDates({...dates, role_targets: newR});
                                         }}
                                      /> {role.label}
                                   </label>
                                ))}
                             </div>
                          </div>

                          <div>
                             <label className="input-label" style={{ fontSize: '0.75rem', marginBottom: '8px', display: 'block' }}>Sedes (Opcional)</label>
                             <div style={{ maxHeight: '120px', overflowY: 'auto', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>
                                   <input 
                                      type="checkbox" 
                                      checked={dates.store_ids.length === 0}
                                      onChange={() => setDates({...dates, store_ids: []})}
                                   /> Todas
                                </label>
                                {stores.map(st => (
                                   <label key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>
                                      <input 
                                         type="checkbox" 
                                         checked={dates.store_ids.includes(st.id)}
                                         onChange={() => {
                                            const newS = dates.store_ids.includes(st.id)
                                               ? dates.store_ids.filter(s => s !== st.id)
                                               : [...dates.store_ids, st.id];
                                            setDates({...dates, store_ids: newS});
                                         }}
                                      /> {st.name}
                                   </label>
                                ))}
                             </div>
                          </div>
                       </div>
                    </div>

                    {errorObj && <p style={{ color: 'var(--accent-danger)', marginBottom: '16px', fontSize: '0.9rem' }}>{errorObj}</p>}

                    <div style={{ display: 'flex', gap: '16px' }}>
                       <button onClick={saveSimulation} disabled={isGenerating} className="btn-primary" style={{ flex: 1 }}>
                         {isGenerating ? <Loader2 className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18}/>}
                         {isGenerating ? ' Guardando...' : ' Guardar en Nube'}
                       </button>
                       <button onClick={() => setGeneratedSim(null)} className="btn-secondary" disabled={isGenerating}>
                         Descartar
                       </button>
                    </div>
                  </div>
                )}
             </div>

             <style>{`
               @keyframes spin { 100% { transform: rotate(360deg); } }
             `}</style>
          </div>
        </div>
      )}
    </>
  );
}
