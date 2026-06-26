import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Target, ChevronRight, Loader2, Play, CheckCircle, XCircle, Bell, Zap, TrendingUp, Star, Dumbbell, ArrowUpCircle } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import climberImg from '../../assets/climber.png';

export default function MobileHome() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const [trainingPlan, setTrainingPlan] = useState([]);
  const [storeKpi, setStoreKpi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [localFitcoins, setLocalFitcoins] = useState(null);
  const [activeNotification, setActiveNotification] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  
  // Progression metrics
  const [progressMetrics, setProgressMetrics] = useState({ total: 0, completed: 0, nextLevel: null });

  const LEVELS = ['Challenger', 'Performer', 'All Star', 'Alto desempeño', 'Marathon Legend'];

  useEffect(() => {
    async function fetchActive() {
       const today = new Date().toISOString().split('T')[0];
       
       if (profile?.id) {
          const { data: notifs } = await supabase
             .from('user_notifications')
             .select('*')
             .eq('user_id', profile.id)
             .eq('is_read', false)
             .order('created_at', { ascending: false })
             .limit(1);
          if (notifs && notifs.length > 0) setActiveNotification(notifs[0]);
       }
       
       // 1. Fetch Challenges
       let chQuery = supabase.from('daily_challenges').select('*');
       if (profile?.brand_id) chQuery = chQuery.eq('brand_id', profile.brand_id);
       const { data: challengesData } = await chQuery.order('created_at', { ascending: false }).limit(50);

       // 2. Fetch Simulations
       let simQuery = supabase.from('simulations').select('*');
       if (profile?.brand_id) simQuery = simQuery.eq('brand_id', profile.brand_id);
       const { data: simsData } = await simQuery;

       if (profile?.id) {
           const { data: freshProfile } = await supabase.from('profiles').select('fitcoins').eq('id', profile.id).single();
           if (freshProfile) setLocalFitcoins(freshProfile.fitcoins ?? 0);

           // Fetch progress
           const { data: chProg } = await supabase.from('user_progress').select('*').eq('user_id', profile.id);
           const { data: simProg } = await supabase.from('user_simulation_progress').select('*').eq('user_id', profile.id);

           const chLog = {};
           chProg?.forEach(p => chLog[p.challenge_id] = p.score === 0 ? 'failed' : 'completed');
           
           const simLog = new Set();
           simProg?.forEach(p => simLog.add(p.simulation_id));

           // Engine Penalization for Challenges
           const overdueInserts = [];
           let penaltiesAmount = 0;
           challengesData?.forEach(ch => {
               if (ch.end_date && ch.end_date < today && !chLog[ch.id]) {
                   overdueInserts.push({ user_id: profile.id, challenge_id: ch.id, score: 0 });
                   penaltiesAmount += 5;
                   chLog[ch.id] = 'failed';
               }
           });

           if (overdueInserts.length > 0) {
               await supabase.from('user_progress').insert(overdueInserts);
               const currentFc = freshProfile?.fitcoins ?? profile.fitcoins ?? 0;
               const finalCoins = Math.max(0, currentFc - penaltiesAmount);
               await supabase.from('profiles').update({ fitcoins: finalCoins }).eq('id', profile.id);
               setLocalFitcoins(finalCoins);
           }

           // Filtering function
           const isApplicable = (item) => {
               // Check role
               let roles = item.role_target || [];
               if (typeof roles === 'string') roles = [roles];
               if (roles.length > 0 && profile.role) {
                   if (!roles.some(r => r.toLowerCase() === profile.role.toLowerCase())) return false;
               }
               // Check store
               let stores = item.store_ids || [];
               if (stores.length > 0 && profile.store_id) {
                   if (!stores.includes(profile.store_id)) return false;
               }
               // Check classification
               if (item.classification_target && profile.classification) {
                   if (item.classification_target !== profile.classification) return false;
               }
               return true;
           };

           // Assemble Training Plan
           const plan = [];
           
           // Active Challenges
           challengesData?.forEach(ch => {
               if ((!ch.end_date || ch.end_date >= today) && isApplicable(ch)) {
                   plan.push({
                      ...ch,
                      type: 'challenge',
                      status: chLog[ch.id] || 'pending'
                   });
               }
           });

           // Active Simulations
           simsData?.forEach(sim => {
               if ((!sim.end_date || sim.end_date >= today) && isApplicable(sim)) {
                   plan.push({
                      ...sim,
                      type: 'simulation',
                      status: simLog.has(sim.id) ? 'completed' : 'pending'
                   });
               }
           });

           // Sort plan: pending first, then by date
           plan.sort((a, b) => {
              if (a.status === 'pending' && b.status !== 'pending') return -1;
              if (a.status !== 'pending' && b.status === 'pending') return 1;
              const dateA = a.created_at || a.active_date || 0;
              const dateB = b.created_at || b.active_date || 0;
              return new Date(dateB) - new Date(dateA);
           });

           setTrainingPlan(plan);

           // Progression Math for current classification
           const currentLevel = profile.classification || 'Challenger';
           const currentIndex = LEVELS.indexOf(currentLevel);
           const nextLvl = currentIndex >= 0 && currentIndex < LEVELS.length - 1 ? LEVELS[currentIndex + 1] : null;

           const tasksForLevel = plan.filter(t => t.classification_target === currentLevel);
           const completedForLevel = tasksForLevel.filter(t => t.status === 'completed');

           setProgressMetrics({
              total: tasksForLevel.length,
              completed: completedForLevel.length,
              nextLevel: nextLvl
           });

           const { data: storeInfo } = await supabase.from('stores').select('*').eq('id', profile.store_id).single();
           if (storeInfo) setStoreKpi(storeInfo);
       }

       setLoading(false);
    }
    fetchActive();
  }, [profile]);

  useEffect(() => {
    if (profile && !sessionStorage.getItem('welcome_classification_shown')) {
       setShowWelcomeModal(true);
    }
  }, [profile]);

  const handleStartTask = (task) => {
     if (task.type === 'challenge') {
        navigate('/app/quiz', { state: { challenge: task } });
     } else {
        navigate('/app/simulator');
     }
  };

  const progressPercentage = progressMetrics.total > 0 
     ? Math.round((progressMetrics.completed / progressMetrics.total) * 100) 
     : 100;

  return (
    <div className="animate-fade-in" style={{ padding: '0', overflowY: 'auto', flex: 1, position: 'relative' }}>
      
      {/* CABECERA (Sticky Glassmorphism) */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: profile?.brands?.logo_url ? 'transparent' : 'var(--accent-primary)', display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '1.2rem', color: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
               {profile?.brands?.logo_url ? (
                   <img src={profile.brands.logo_url} alt={profile.brands.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                   profile?.brands?.name ? profile.brands.name.charAt(0).toUpperCase() : (profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U')
                )}
            </div>
            <div>
               <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-muted)' }}>Entrenamiento de</p>
               <h1 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800, color: 'var(--text-main)' }}>{profile?.full_name ? (() => { const name = profile.full_name.split(' ')[0]; return name.charAt(0).toUpperCase() + name.slice(1); })() : 'Compañero'}</h1>
               <div style={{ marginTop: '4px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, background: 'rgba(0,180,255,0.1)', color: 'var(--accent-primary)', padding: '3px 8px', borderRadius: '12px', border: '1px solid rgba(0,180,255,0.2)', textTransform: 'uppercase', display: 'inline-block' }}>
                     Rango: {profile?.classification || 'Challenger'}
                  </span>
               </div>
            </div>
         </div>
         <div style={{ 
             background: 'rgba(255,175,0,0.1)', border: '1px solid rgba(255,175,0,0.2)',
             padding: '8px 14px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '6px',
             boxShadow: '0 0 20px rgba(255,175,0,0.1)'
         }}>
             <Zap size={16} fill="var(--accent-warning)" color="var(--accent-warning)" style={{ animation: 'pulse 2s infinite' }} />
             <strong style={{ color: 'var(--accent-warning)', fontSize: '0.95rem', fontWeight: 800 }}>
               {localFitcoins !== null ? localFitcoins : (profile?.fitcoins || 0)} FC
             </strong>
         </div>
      </div>

      <div style={{ padding: '0 20px' }}>
         
         {/* BARRA DE PROGRESO DE ASCENSO */}
         {progressMetrics.nextLevel && (
           <div className="glass-panel scale-on-tap" style={{ margin: '24px 0', padding: '24px', position: 'relative', overflow: 'hidden', border: '2px solid rgba(0,240,255,0.2)', background: 'linear-gradient(135deg, rgba(0,240,255,0.05), rgba(112,0,255,0.05))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                 <div>
                    <h3 style={{ fontSize: '1rem', color: 'var(--accent-primary)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
                       <ArrowUpCircle size={18} /> Siguiente Ascenso
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                       Destino: <strong style={{ color: 'var(--text-main)' }}>{progressMetrics.nextLevel}</strong>
                    </p>
                 </div>
                 <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(0,180,255,0.1)', display: 'grid', placeItems: 'center', fontWeight: 800, color: 'var(--accent-primary)', border: '2px solid var(--accent-primary)' }}>
                    {progressPercentage}%
                 </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.1)', height: '10px', borderRadius: '5px', overflow: 'hidden', marginBottom: '12px' }}>
                 <div style={{ 
                    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))', 
                    width: `${progressPercentage}%`, 
                    height: '100%', borderRadius: '5px', transition: 'width 0.5s ease-out'
                 }}></div>
              </div>

              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-main)', textAlign: 'center', fontWeight: 600 }}>
                 {progressMetrics.total - progressMetrics.completed > 0 
                   ? `¡Te faltan ${progressMetrics.total - progressMetrics.completed} entrenamientos para ascender!`
                   : `¡Entrenamientos completados! Reclama tu ascenso.`}
              </p>
           </div>
         )}

         {/* NOTIFICACIÓN / NUDGE DEL JEFE */}
         {activeNotification && (
            <div className="scale-on-tap" style={{
               background: 'linear-gradient(135deg, var(--accent-danger), #ff6b6b)',
               borderRadius: '20px', padding: '20px', marginTop: '0', marginBottom: '24px', color: '#fff',
               position: 'relative', boxShadow: '0 10px 30px rgba(255,0,0,0.2)',
               border: '2px solid rgba(255,255,255,0.1)', overflow: 'hidden'
            }}>
               <Bell size={64} style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1, transform: 'rotate(15deg)' }} />
               <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800 }}>📣 Alerta del Entrenador</h4>
               <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.4, fontWeight: 600 }}>{activeNotification.message}</p>
               <button 
                  onClick={async () => {
                     await supabase.from('user_notifications').update({ is_read: true }).eq('id', activeNotification.id);
                     setActiveNotification(null);
                  }}
                  style={{ 
                     marginTop: '16px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', 
                     padding: '10px 20px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' 
                  }}
               >
                  ¡Entendido!
               </button>
            </div>
         )}
      </div>

      {/* RUTINA DEL DÍA */}
      <div style={{ padding: '0 20px 40px' }}>
         <h2 style={{ fontSize: '1.2rem', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Dumbbell size={20} color="var(--accent-primary)" /> Rutina del Día
         </h2>
         
         {loading ? (
             <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <Loader2 className="animate-spin text-accent-primary" size={32} style={{ margin: '0 auto 12px auto' }} />
             </div>
         ) : trainingPlan.length === 0 ? (
             <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
                <CheckCircle size={48} color="var(--accent-success)" style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
                <p style={{ color: 'var(--text-main)', margin: '0 0 8px 0', fontWeight: 700 }}>¡Día Libre!</p>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>No tienes rutinas pendientes para hoy.</p>
             </div>
         ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 {trainingPlan.map((task, idx) => {
                    const isFailed = task.status === 'failed';
                    const isCompleted = task.status === 'completed';
                    const isChallenge = task.type === 'challenge';
                    
                    return (
                       <div key={`${task.type}-${task.id}`} className="scale-on-tap" style={{
                          background: isFailed ? 'rgba(204,0,0,0.05)' : (isCompleted ? 'rgba(0,255,100,0.05)' : 'rgba(255,255,255,0.7)'),
                          border: isFailed ? '1px solid rgba(204,0,0,0.2)' : (isCompleted ? '1px solid rgba(0,255,100,0.3)' : '1px solid rgba(0,0,0,0.05)'),
                          borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column',
                          opacity: (isCompleted || isFailed) ? 0.6 : 1, transition: 'all 0.2s', backdropFilter: 'blur(10px)',
                          position: 'relative', overflow: 'hidden'
                       }}>
                          {isCompleted && <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '80px', height: '80px', background: 'rgba(0,255,100,0.1)', borderRadius: '50%', pointerEvents: 'none' }}></div>}
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                             <div>
                                <span style={{ 
                                   fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', 
                                   color: isChallenge ? '#7000ff' : '#00b4ff', 
                                   background: isChallenge ? 'rgba(112,0,255,0.1)' : 'rgba(0,180,255,0.1)',
                                   padding: '4px 8px', borderRadius: '8px', marginBottom: '8px', display: 'inline-block' 
                                }}>
                                   {isChallenge ? 'Conocimiento' : 'Práctica / Roleplay'}
                                </span>
                                <h4 style={{ margin: '0', fontSize: '1.05rem', lineHeight: 1.3, color: 'var(--text-main)', fontWeight: 800 }}>
                                   Rutina {idx + 1}: {task.title}
                                </h4>
                             </div>
                             
                             {(isCompleted || isFailed) ? (
                                isCompleted ? <CheckCircle size={24} color="#00ff64" /> : <XCircle size={24} color="#ff3232" />
                             ) : null}
                          </div>
                          
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                             {isChallenge ? task.description : task.scenario_description}
                          </p>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '16px' }}>
                             <div style={{ display: 'flex', gap: '12px' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800 }}>
                                   <Zap size={14} fill="currentColor"/> +{task.reward_fitcoins ?? 15} FC
                                </span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800 }}>
                                   <Target size={14} /> +{task.reward_xp} XP
                                </span>
                             </div>
                             
                             {(!isCompleted && !isFailed) && (
                                <button onClick={() => handleStartTask(task)} 
                                   className="btn-primary"
                                   style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                   Empezar <ChevronRight size={16} />
                                </button>
                             )}
                          </div>
                       </div>
                    )
                 })}
             </div>
         )}
      </div>

      {/* Welcome Classification Modal */}
      {showWelcomeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 9999,
          display: 'grid', placeItems: 'center', padding: '24px'
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '100%', maxWidth: '380px', background: 'var(--bg-dark)',
            border: '2px solid var(--accent-primary)', borderRadius: '24px',
            padding: '32px 24px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px'
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'rgba(0,180,255,0.1)', border: '2px dashed var(--accent-primary)',
              display: 'grid', placeItems: 'center', color: 'var(--accent-primary)',
              animation: 'pulse 2s infinite'
            }}>
              <Star size={40} fill="currentColor" />
            </div>

            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-main)' }}>
                ¡Clasificación de Carrera!
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
                Hola <strong style={{ color: 'var(--text-main)' }}>{profile?.full_name?.split(' ')[0]}</strong>, tu nivel actual es:
              </p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(0,180,255,0.15), rgba(0,72,130,0.15))',
              border: '1px solid var(--accent-primary)', borderRadius: '16px',
              padding: '16px 24px', width: '100%'
            }}>
              <span style={{
                fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-primary)',
                textTransform: 'uppercase', letterSpacing: '1px'
              }}>
                {profile?.classification || 'Challenger'}
              </span>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
              Tus rutinas y simuladores de venta por IA se han adaptado automáticamente a este nivel para impulsar tu crecimiento profesional.
            </p>

            <button
              onClick={() => {
                setShowWelcomeModal(false);
                sessionStorage.setItem('welcome_classification_shown', 'true');
              }}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: '12px' }}
            >
              ¡Comenzar Entrenamiento!
            </button>
          </div>
        </div>
      )}

      <style>{`
        .scale-on-tap:active {
           transform: scale(0.97);
        }
        @keyframes pulse {
           0%, 100% { transform: scale(1); opacity: 1; }
           50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
