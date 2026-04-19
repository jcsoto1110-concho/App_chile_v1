import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Play, CheckCircle, XCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';

export default function MobileQuiz() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const challenge = location.state?.challenge;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [resultStatus, setResultStatus] = useState(null); // 'success' | 'error' | null
  const [isProcessing, setIsProcessing] = useState(false);
  const [examPassed, setExamPassed] = useState(false);
  const [scoreCount, setScoreCount] = useState(0);
  const [earnedStats, setEarnedStats] = useState({ xp: 0, fc: 0 });
  const [isLocked, setIsLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);

  // Timer para Trivia Exprés
  React.useEffect(() => {
     if (!challenge?.is_flash || resultStatus !== null || isProcessing || examPassed || isLocked) return;
     
     const timer = setInterval(() => {
        setTimeLeft(prev => {
            if (prev <= 1) {
               clearInterval(timer);
               handleSelect(-1); // Falla forzosamente por falta de tiempo
               return 0;
            }
            return prev - 1;
        });
     }, 1000);

     return () => clearInterval(timer);
  }, [currentIndex, challenge?.is_flash, resultStatus, isProcessing, examPassed, isLocked]);

  React.useEffect(() => {
      setTimeLeft(20);
  }, [currentIndex]);

  // Escudo Protector: Revisar si este usuario ya cursó este examen para bloquar trampas
  React.useEffect(() => {
     if (profile?.id && challenge?.id) {
         supabase.from('user_progress').select('*')
           .eq('user_id', profile.id)
           .eq('challenge_id', challenge.id)
           .maybeSingle()
           .then(({ data }) => {
               if (data) {
                  setIsLocked(true); // Ya existe un registro, trampa detectada
               }
           });
     }
  }, [profile, challenge]);

  if (!challenge) {
     return <div style={{ padding: '20px', color: '#fff' }}>No se pudo cargar el reto. <button onClick={() => navigate('/app/home')}>Volver</button></div>;
  }

  // Normalizamos a Array por si viene del formato viejo
  const quizArray = Array.isArray(challenge.quiz_data) ? challenge.quiz_data : (challenge.quiz_data ? [challenge.quiz_data] : null);
  const currentQuiz = quizArray ? quizArray[currentIndex] : null;

  const handleSelect = async (index) => {
    if (resultStatus !== null || isProcessing) return;
    setSelectedOption(index);
    setIsProcessing(true);

    const isCorrect = !currentQuiz || index === currentQuiz.correctIndex;

    if (isCorrect) {
       setResultStatus('success');
       setScoreCount(prev => prev + 1);
    } else {
       setResultStatus('error');
    }

    setTimeout(async () => {
        // Lógica de Siguiente Escena
        const isLastQuestion = !quizArray || currentIndex === quizArray.length - 1;

        if (isLastQuestion) {
            // FIN DEL EXAMEN
            const finalHits = isCorrect ? scoreCount + 1 : scoreCount;
            const percentage = quizArray ? (finalHits / quizArray.length) : 1;
            
            // Recompensa Proporcional al rendimiento
            const earnedXp = Math.max(1, Math.round(challenge.reward_xp * percentage)); // Al menos 1 xp por terminar
            const earnedCoins = Math.round(challenge.reward_fitcoins * percentage); 

            setEarnedStats({ xp: earnedXp, fc: earnedCoins, percentage: Math.round(percentage * 100) });

            const newXp = (profile.current_xp || 0) + earnedXp;
            const newCoins = (profile.fitcoins || 0) + earnedCoins;

            await supabase.from('profiles').update({
               current_xp: newXp,
               fitcoins: newCoins
            }).eq('id', profile.id);

            await supabase.from('user_progress').insert({
               user_id: profile.id,
               challenge_id: challenge.id,
               score: Math.round(percentage * 100)
            });
            
            setExamPassed(true);
        } else {
            // Moverse Inexorablemente a la Siguiente Pregunta
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setResultStatus(null);
        }
        setIsProcessing(false);
    }, 1500); // 1.5s para asimilar si acertó o falló visualmente antes de saltar
  };

  if (isLocked) {
     return (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#fff', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ color: 'var(--accent-danger)' }}>Acceso Bloqueado</h2>
            <p>Ya has rendido esta evaluación académica. Tus resultados fueron registrados permanentemente en Supabase.</p>
            <button onClick={() => navigate('/app/home')} className="btn-secondary">Regresar al inicio</button>
        </div>
     );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: '20px' }}>
      
      {/* Header Back */}
      <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '16px' }}>
         <button onClick={() => navigate('/app/home')} style={{ background: 'transparent', border: 'none', color: '#fff', display: 'flex' }}>
            <ArrowLeft size={20} />
         </button>
         <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 600 }}>Cápsula de Aprendizaje</h2>
      </div>

      <div style={{ padding: '24px 20px', overflowY: 'auto', flex: 1 }}>
         
         {!examPassed ? (
            <>
              <h1 style={{ fontSize: '1.4rem', marginBottom: '8px', lineHeight: 1.3 }}>{challenge.title}</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '24px' }}>
                 {challenge.description}
              </p>

              {/* Contenido Multimedia */}
              {challenge.content_url && (
                 <div style={{ marginBottom: '32px' }}>
                    <button 
                      onClick={() => window.open(challenge.content_url, '_blank')}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', color: '#fff' }}
                    >
                       <div style={{ background: '#ff0000', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                          <Play size={16} fill="#fff" color="#fff" />
                       </div>
                       <div style={{ textAlign: 'left', flex: 1 }}>
                          <span style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem' }}>Ver Video de Soporte</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Abre en otra pestaña</span>
                       </div>
                    </button>
                 </div>
              )}
              
              {/* SECCIÓN EVALUACIÓN QUIZ MÚLTIPLE */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '20px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
                 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--accent-primary)' }}>
                     {/* Barra de progreso visual */}
                     {quizArray && <div style={{ height: '100%', width: `${((currentIndex) / quizArray.length) * 100}%`, background: '#00ff64', transition: 'width 0.3s' }}></div>}
                 </div>
                 
                 <h3 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--accent-primary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Test de Comprensión</span>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        {challenge.is_flash && <span style={{ color: timeLeft <= 5 ? '#ff3232' : 'var(--accent-warning)', fontWeight: 'bold' }}>⏱️ {timeLeft}s</span>}
                        {quizArray && <span>{currentIndex + 1} / {quizArray.length}</span>}
                    </div>
                 </h3>
                 <p style={{ fontSize: '1.1rem', marginBottom: '24px', fontWeight: 500, lineHeight: 1.4 }}>
                    {currentQuiz ? currentQuiz.question : 'Para aprobar este reto, marca "Entendido".'}
                 </p>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(currentQuiz ? currentQuiz.options : ['Entendido']).map((opt, index) => {
                       
                       let btnColor = 'var(--bg-dark)';
                       let btnBorder = '1px solid rgba(255,255,255,0.1)';
                       
                       if (selectedOption === index) {
                           if (resultStatus === 'success') {
                               btnColor = 'rgba(0,255,100,0.1)';
                               btnBorder = '1px solid #00ff64';
                           } else if (resultStatus === 'error') {
                               btnColor = 'rgba(255,0,0,0.1)';
                               btnBorder = '1px solid #ff3232';
                           } else {
                               btnColor = 'rgba(255,255,255,0.1)'; // Loading
                           }
                       }

                       return (
                          <button 
                             key={index}
                             onClick={() => handleSelect(index)}
                             disabled={isProcessing || resultStatus !== null}
                             style={{ 
                                background: btnColor, 
                                border: btnBorder, 
                                color: '#fff', 
                                padding: '16px 20px', 
                                borderRadius: '12px', 
                                textAlign: 'left',
                                fontSize: '0.95rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.2s',
                                cursor: (isProcessing || resultStatus !== null) ? 'default' : 'pointer'
                             }}
                          >
                             <span>{opt}</span>
                             {selectedOption === index && resultStatus === 'success' && <CheckCircle size={18} color="#00ff64" />}
                             {selectedOption === index && resultStatus === 'error' && <XCircle size={18} color="#ff3232" />}
                          </button>
                       )
                    })}
                 </div>

                 {resultStatus === 'error' && (
                    <div className="animate-fade-in" style={{ marginTop: '24px', textAlign: 'center' }}>
                        <p style={{ color: '#ff3232', fontSize: '0.9rem' }}>{selectedOption === -1 ? '¡Se agotó el tiempo!' : 'Incorrecto.'} Saltando a la siguiente...</p>
                    </div>
                 )}
              </div>
            </>
         ) : (
            /* PANTALLA ÉXITO / RENDIMIENTO TOTAL */
            <div className="animate-fade-in" style={{ textAlign: 'center', padding: '40px 20px', marginTop: '20px', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '24px' }}>
                <div style={{ width: '80px', height: '80px', background: earnedStats.percentage > 50 ? 'rgba(0, 255, 100, 0.1)' : 'rgba(255, 175, 0, 0.1)', borderRadius: '50%', margin: '0 auto 24px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   {earnedStats.percentage > 50 ? <CheckCircle size={40} color="#00ff64" /> : <Play size={40} color="var(--accent-warning)" />}
                </div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Test Finalizado</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>
                   Tuviste un <strong style={{ color: '#fff' }}>{earnedStats.percentage}%</strong> de efectividad en el examen.
                </p>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.85rem' }}>Recompensa calculada sobre tu rendimiento:</p>
                
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '32px' }}>
                   <span className="badge primary" style={{ fontSize: '1.1rem', padding: '8px 16px' }}>+{earnedStats.xp} XP</span>
                   <span className="badge warning" style={{ fontSize: '1.1rem', padding: '8px 16px' }}>+{earnedStats.fc} FC</span>
                </div>

                <button onClick={() => navigate('/app/home')} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                   Volver a Inicio
                </button>
            </div>
         )}
         
      </div>
    </div>
  );
}
