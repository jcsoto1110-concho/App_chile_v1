import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Target, ChevronRight, Loader2, Play, CheckCircle, XCircle, Bell, Zap, TrendingUp, Star, BookOpen } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import climberImg from '../../assets/climber.png';

export default function MobileHome() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState([]);
  const [progressLog, setProgressLog] = useState({});
  const [storeKpi, setStoreKpi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [localFitcoins, setLocalFitcoins] = useState(null); // FC en tiempo real desde DB
  const [activeNotification, setActiveNotification] = useState(null);

  useEffect(() => {
    async function fetchActive() {
       const today = new Date().toISOString().split('T')[0];
       
       // 1. Notificaciones/Nudges del Jefe
       if (profile?.id) {
          const { data: notifs } = await supabase
             .from('user_notifications')
             .select('*')
             .eq('user_id', profile.id)
             .eq('is_read', false)
             .order('created_at', { ascending: false })
             .limit(1);
          if (notifs && notifs.length > 0) {
             setActiveNotification(notifs[0]);
          }
       }
       
       // Filtrado Avanzado: Retos que incluyan mi rol Y mi tienda (o sean globales)
       let query = supabase.from('daily_challenges').select('*');
       if (profile?.brand_id) {
          query = query.eq('brand_id', profile.brand_id);
       }
       
       if (profile?.role) {
          query = query.or(`role_target.is.null,role_target.cs.{"${profile.role.toLowerCase()}"}`);
       }
       if (profile?.store_id) {
          query = query.or(`store_ids.is.null,store_ids.cs.{"${profile.store_id}"}`);
       }

       const { data } = await query
          .order('created_at', { ascending: false })
          .limit(10);
       
       if (data) setChallenges(data);

       if (profile?.id && data) {
           // Refrescar FC real desde DB (no del contexto que queda viejo)
           const { data: freshProfile } = await supabase
               .from('profiles').select('fitcoins').eq('id', profile.id).single();
           if (freshProfile) setLocalFitcoins(freshProfile.fitcoins ?? 0);

           const { data: prog } = await supabase.from('user_progress').select('*').eq('user_id', profile.id);
           const pLog = {};
           prog?.forEach(p => pLog[p.challenge_id] = p.score === 0 ? 'failed' : 'completed');
           
           // --------- MOTOR DE PENALIZACIÓN AUTÓNOMO ---------
           const todayRaw = new Date().toISOString().split('T')[0];
           const overdueInserts = [];
           let penaltiesAmount = 0;

           data.forEach(ch => {
               if (ch.end_date && ch.end_date < todayRaw && !pLog[ch.id]) {
                   overdueInserts.push({ user_id: profile.id, challenge_id: ch.id, score: 0 });
                   penaltiesAmount += 5; // Reducido a 5 FC por reto (no 100)
                   pLog[ch.id] = 'failed';
               }
           });

           if (overdueInserts.length > 0) {
               await supabase.from('user_progress').insert(overdueInserts);
               const currentFc = freshProfile?.fitcoins ?? profile.fitcoins ?? 0;
               const finalCoins = Math.max(0, currentFc - penaltiesAmount); // Mínimo 0, nunca negativo
               await supabase.from('profiles').update({ fitcoins: finalCoins }).eq('id', profile.id);
               setLocalFitcoins(finalCoins);
           }
           // ----------------------------------------------------

           setProgressLog(pLog);

           const { data: storeInfo } = await supabase.from('stores').select('*').eq('id', profile.store_id).single();
           if (storeInfo) setStoreKpi(storeInfo);
       }

       setLoading(false);
    }
    fetchActive();
  }, [profile]);

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
               <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-muted)' }}>Bienvenido de vuelta,</p>
               <h1 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800, color: 'var(--text-main)' }}>{profile?.full_name ? (() => { const name = profile.full_name.split(' ')[0]; return name.charAt(0).toUpperCase() + name.slice(1); })() : 'Compañero'}</h1>
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
         {/* NOTIFICACIÓN / NUDGE DEL JEFE */}
         {activeNotification && (
            <div className="scale-on-tap" style={{
               background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
               borderRadius: '20px', padding: '20px', marginTop: '24px', color: '#fff',
               position: 'relative', boxShadow: '0 10px 30px rgba(0,72,130,0.2)',
               border: '2px solid rgba(255,255,255,0.1)', overflow: 'hidden'
            }}>
               <Bell size={64} style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1, transform: 'rotate(15deg)' }} />
               <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800 }}>📣 Mensaje de tu Jefe</h4>
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

         {/* KPI DASHBOARD CARD */}
         {storeKpi && storeKpi.monthly_sales_goal > 0 && (
            <div className="glass-panel" style={{ margin: '24px 0', padding: '24px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
               <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'var(--accent-primary)', opacity: 0.05, borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }}></div>
               <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={16} color="var(--accent-primary)" /> Objetivo de Sucursal
               </h3>
               
               <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, color: 'var(--text-main)' }}>
                     {Math.round(((storeKpi.current_sales || 0) / storeKpi.monthly_sales_goal) * 100)}%
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', marginBottom: '8px', fontWeight: 700 }}>Completado</span>
               </div>

               <div style={{ background: 'rgba(0,0,0,0.05)', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '12px' }}>
                   <div style={{ 
                      background: 'var(--accent-primary)', 
                      width: `${Math.min(100, ((storeKpi.current_sales || 0) / storeKpi.monthly_sales_goal) * 100)}%`, 
                      height: '100%', borderRadius: '6px'
                   }}></div>
               </div>
               
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                   <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Llevan: ${(storeKpi.current_sales || 0).toLocaleString()}</span>
                   <span>Faltan: ${(storeKpi.monthly_sales_goal - (storeKpi.current_sales || 0)).toLocaleString()}</span>
               </div>
            </div>
         )}
      </div>

      {/* HERO CARD: RETO DESTACADO */}
      {challenges.length > 0 && !progressLog[challenges[0].id] && (
        <div style={{ margin: '0 20px 32px' }}>
           <h2 style={{ fontSize: '1.1rem', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--text-main)' }}>
              <Star size={18} color="var(--accent-primary)" fill="var(--accent-primary)" /> Reto Destacado
           </h2>
           <div className="scale-on-tap" style={{
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
              border: 'none', borderRadius: '24px', padding: '32px 24px',
              position: 'relative', overflow: 'hidden', boxShadow: '0 15px 40px rgba(0,72,130,0.2)'
           }}>
              <img src={climberImg} alt="" style={{ position: 'absolute', right: '-40px', top: '5%', height: '120%', opacity: 0.2, objectFit: 'contain', pointerEvents: 'none' }} />
              
              <div style={{ position: 'relative', zIndex: 2, width: '80%' }}>
                 <span style={{ background: 'var(--accent-danger)', color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'inline-block' }}>Nueva Misión</span>
                 <h3 style={{ fontSize: '1.6rem', margin: '0 0 12px 0', lineHeight: 1.2, fontWeight: 800, color: '#fff' }}>{challenges[0].title}</h3>
                 <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', margin: '0 0 24px 0', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {challenges[0].description}
                 </p>
                 <button onClick={() => navigate('/app/quiz', { state: { challenge: challenges[0] } })} 
                    className="btn-primary" 
                    style={{ width: '100%', justifyContent: 'center', gap: '8px', padding: '16px', borderRadius: '16px', background: '#fff', color: 'var(--accent-primary)', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>
                    <Play fill="currentColor" size={16} /> Comenzar Ahora
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* LISTA DE MÓDULOS TEÓRICOS */}
      <div style={{ padding: '0 20px 40px' }}>
         <h2 style={{ fontSize: '1.1rem', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--text-main)' }}>
            <BookOpen size={18} color="var(--accent-primary)" /> Módulos Teóricos
         </h2>
         
         {loading ? (
             <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <Loader2 className="animate-spin text-accent-primary" size={32} style={{ margin: '0 auto 12px auto' }} />
             </div>
         ) : challenges.length === 0 ? (
             <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>No tienes contenido pendiente.</p>
             </div>
         ) : (
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                 {challenges.map(ch => {
                    const status = progressLog[ch.id];
                    const isFailed = status === 'failed';
                    const isCompleted = status === 'completed';
                    
                    return (
                       <div key={ch.id} className="scale-on-tap" style={{
                          background: isFailed ? 'rgba(204,0,0,0.05)' : 'rgba(255,255,255,0.7)',
                          border: isFailed ? '1px solid rgba(204,0,0,0.1)' : '1px solid rgba(0,0,0,0.05)',
                          borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column',
                          opacity: isCompleted ? 0.5 : 1, transition: 'transform 0.2s', backdropFilter: 'blur(10px)',
                          position: 'relative'
                       }}>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', lineHeight: 1.3, color: isFailed ? 'var(--accent-danger)' : 'var(--text-main)', fontWeight: 700 }}>
                             {ch.title}
                          </h4>
                          
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                             <span style={{ fontSize: '0.75rem', color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                                <Zap size={12} fill="currentColor"/> {ch.reward_fitcoins}
                             </span>
                             <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                                <Target size={12} /> {ch.reward_xp} XP
                             </span>
                          </div>
                          
                          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                             {isCompleted ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-success)', fontSize: '0.75rem', fontWeight: 700 }}>
                                   <CheckCircle size={16} /> Hecho
                                </div>
                             ) : isFailed ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-danger)', fontSize: '0.75rem', fontWeight: 700 }}>
                                   <XCircle size={16} /> Reprobado
                                </div>
                             ) : (
                                <button onClick={() => navigate('/app/quiz', { state: { challenge: ch } })} 
                                   style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-primary)', border: 'none', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,72,130,0.2)' }}>
                                   <ChevronRight size={18} />
                                </button>
                             )}
                          </div>
                       </div>
                    )
                 })}
             </div>
         )}
      </div>

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
