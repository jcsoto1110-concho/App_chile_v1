import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Target, ChevronRight, Loader2, Play, CheckCircle, XCircle, Bell } from 'lucide-react';
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
    <div className="animate-fade-in" style={{ padding: '24px 20px', overflowY: 'auto', flex: 1, position: 'relative' }}>
      
      {/* NOTIFICACIÓN / NUDGE DEL JEFE */}
      {activeNotification && (
         <div style={{
            background: 'linear-gradient(135deg, var(--accent-primary), #00ff64)',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '24px',
            color: '#000',
            position: 'relative',
            boxShadow: '0 10px 30px rgba(0,255,100,0.2)',
            border: '2px solid rgba(255,255,255,0.3)'
         }}>
            <Bell size={24} style={{ position: 'absolute', right: '15px', top: '15px', opacity: 0.3 }} />
            <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800 }}>📣 Mensaje de tu Jefe</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.4, fontWeight: 500 }}>{activeNotification.message}</p>
            <button 
               onClick={async () => {
                  await supabase.from('user_notifications').update({ is_read: true }).eq('id', activeNotification.id);
                  setActiveNotification(null);
               }}
               style={{ 
                  marginTop: '12px', background: 'rgba(0,0,0,0.8)', color: '#fff', border: 'none', 
                  padding: '6px 16px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' 
               }}
            >
               Entendido
            </button>
         </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
         <div>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>Hola, {profile?.full_name ? profile.full_name.split(' ')[0] : 'Compañero'}</p>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }} className="text-gradient">Tus Misiones</h1>
         </div>
         <div style={{ background: 'rgba(255, 175, 0, 0.1)', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
             <span style={{ fontSize: '1rem' }}>⚡</span>
             <strong style={{ color: 'var(--accent-warning)', fontSize: '0.9rem' }}>
               {localFitcoins !== null ? localFitcoins : (profile?.fitcoins || 0)} FC
             </strong>
         </div>
      </div>

      {storeKpi && storeKpi.monthly_sales_goal > 0 && (
         <div style={{ marginBottom: '32px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                 <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Meta Sucursal: {storeKpi.name}</span>
                 <span style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>{Math.round(((storeKpi.current_sales || 0) / storeKpi.monthly_sales_goal) * 100)}%</span>
             </div>
             <div style={{ background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                 <div style={{ background: 'linear-gradient(90deg, var(--accent-primary), #00ff64)', width: `${Math.min(100, ((storeKpi.current_sales || 0) / storeKpi.monthly_sales_goal) * 100)}%`, height: '100%', borderRadius: '4px' }}></div>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                 <span>Llevan: ${(storeKpi.current_sales || 0).toLocaleString()}</span>
                 <span>Faltan: ${(storeKpi.monthly_sales_goal - (storeKpi.current_sales || 0)).toLocaleString()}</span>
             </div>
         </div>
      )}

      {challenges.length > 0 && !progressLog[challenges[0].id] && (
        <div style={{ marginBottom: '32px' }}>
           <h2 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Reto Destacado</h2>
            <div style={{ 
               background: 'linear-gradient(135deg, rgba(0,240,255,0.1) 0%, rgba(112,0,255,0.15) 100%)', 
               border: '1px solid var(--accent-primary)',
               borderRadius: '20px', 
               padding: '24px',
               position: 'relative',
               overflow: 'hidden'
            }}>
               {/* IMAGEN DE ESCALADOR DE FONDO */}
               <img 
                 src={climberImg} 
                 alt="" 
                 style={{ 
                   position: 'absolute', right: '-30px', top: '0', 
                   height: '100%', width: 'auto',
                   opacity: 0.25, objectFit: 'contain', 
                   pointerEvents: 'none' 
                 }} 
               />
               <div style={{ position: 'relative', zIndex: 2 }}>
                  <span className="badge primary" style={{ marginBottom: '12px', display: 'inline-block' }}>Nueva Misión</span>
                  <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>{challenges[0].title}</h3>
                  <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                     {challenges[0].description}
                  </p>
                  <button onClick={() => navigate('/app/quiz', { state: { challenge: challenges[0] } })} className="btn-primary" style={{ width: '100%', justifyContent: 'center', gap: '8px' }}>
                     <Play fill="currentColor" size={16} /> Iniciar Reto
                  </button>
               </div>
            </div>
        </div>
      )}

      <div>
         <h2 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Módulos Teóricos</h2>
         {loading ? (
             <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                <Loader2 className="animate-spin text-accent-primary" size={24} style={{ margin: '0 auto 12px auto' }} />
             </div>
         ) : challenges.length === 0 ? (
             <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                <p className="text-muted">No tienes contenido pendiente.</p>
             </div>
         ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {challenges.map(ch => {
                    const status = progressLog[ch.id];
                    
                    return (
                       <div key={ch.id} style={{ 
                          background: 'rgba(0,0,0,0.4)', 
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: '16px', 
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          opacity: status ? 0.6 : 1
                       }}>
                          <div style={{ flex: 1 }}>
                             <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>{ch.title}</div>
                             <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
                                <span style={{ color: 'var(--accent-warning)' }}>+{ch.reward_fitcoins} FC</span>
                                <span style={{ color: 'var(--accent-primary)' }}>+{ch.reward_xp} XP</span>
                             </div>
                          </div>
                          
                          {status === 'completed' ? (
                             <div style={{ color: '#00ff64', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }}><CheckCircle size={16}/> Hecho</div>
                          ) : status === 'failed' ? (
                             <div style={{ color: '#ff3232', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }}><XCircle size={16}/> Reprobado</div>
                          ) : (
                             <button 
                                onClick={() => navigate('/app/quiz', { state: { challenge: ch } })} 
                                style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                             >
                                 <ChevronRight size={18} />
                             </button>
                          )}
                       </div>
                    )
                 })}
             </div>
         )}
      </div>
    </div>
  );
}
