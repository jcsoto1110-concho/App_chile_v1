import React, { useState, useEffect } from 'react';
import { Plus, Clock, Edit2, Loader2, Save, X, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ChallengesManagement() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  // States para el form/modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorObj, setErrorObj] = useState(null);
  
  // Usamos el estandar de la DB (yyy-mm-dd format for HTML date picker)
  const todayRaw = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content_url: '',
    role_target: '',
    reward_xp: 10,
    reward_fitcoins: 5,
    active_date: todayRaw,
    end_date: todayRaw,
    is_flash: false,
    is_live: false,
    quiz_questions: [{ question: '', opt0: '', opt1: '', opt2: '', correct: 0 }]
  });

  async function fetchChallenges() {
    setLoading(true);
    const { data, error } = await supabase.from('daily_challenges').select('*').order('created_at', { ascending: false });
    if (!error && data) {
       setChallenges(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchChallenges();
  }, []);

  const handleSaveChallenge = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorObj(null);

    // Evaluamos el banco de preguntas si existe al menos una válida
    const validQuestions = formData.quiz_questions.filter(q => q.question.trim() && q.opt0.trim() && q.opt1.trim());
    
    let quizData = null;
    if (validQuestions.length > 0) {
        quizData = validQuestions.map(q => ({
            question: q.question,
            options: [q.opt0, q.opt1, q.opt2].filter(v => v && v.trim() !== ''),
            correctIndex: parseInt(q.correct)
        }));
    }

    const { error } = await supabase.from('daily_challenges').insert({
       title: formData.title,
       description: formData.description,
       content_url: formData.content_url || null,
       role_target: formData.role_target || null,   // null significa todos 
       reward_xp: parseInt(formData.reward_xp) || 10,
       reward_fitcoins: parseInt(formData.reward_fitcoins) || 5,
       active_date: formData.active_date,
       end_date: formData.end_date,
       is_flash: formData.is_flash,
       is_live: formData.is_live,
       quiz_data: quizData
    });

    setIsSaving(false);

    if (!error) {
       setIsModalOpen(false);
       setFormData({
          title: '', description: '', content_url: '',  
          role_target: '', reward_xp: 10, reward_fitcoins: 5, active_date: todayRaw, end_date: todayRaw,
          is_flash: false, is_live: false,
          quiz_questions: [{ question: '', opt0: '', opt1: '', opt2: '', correct: 0 }]
       });
       fetchChallenges();
    } else {
       setErrorObj(error.message);
    }
  };

  return (
    <>
      <div className="animate-fade-in relative">
        <div className="header-action">
        <div>
          <h1 className="text-gradient">Retos Diarios</h1>
          <p className="text-muted" style={{ marginTop: '4px' }}>Crea y gestiona las cápsulas de microlearning del Coach</p>
        </div>
        <button onClick={() => { setIsModalOpen(true); setErrorObj(null); }} className="btn-primary">
          <Plus size={18} /> Nuevo Reto
        </button>
      </div>

      {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Loader2 className="animate-spin text-accent-primary" size={32} style={{ margin: '0 auto 12px auto', animation: 'spin 1s linear infinite' }} />
              <p>Buscando misiones asignadas...</p>
          </div>
      ) : challenges.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <p>No has creado ningún reto diario todavía.</p>
          </div>
      ) : (
        <div className="grid grid-3" style={{ marginBottom: '32px' }}>
           {challenges.map(challenge => (
              <div key={challenge.id} className="glass-panel animate-fade-in" style={{ padding: '24px', position: 'relative' }}>
                 <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
                    <span className="badge success">Activo</span>
                 </div>
                 <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', paddingRight: '60px' }}>{challenge.title}</h3>
                 <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '16px' }}>Dirigido a: {challenge.role_target || 'Todos'}</p>
                 
                 <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                    <span className="badge warning">+{challenge.reward_fitcoins} FC</span>
                    <span className="badge primary">+{challenge.reward_xp} XP</span>
                 </div>

                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                       <Clock size={14} /> Cierre: {challenge.end_date ? new Date(challenge.end_date).toLocaleDateString() : 'N/A'}
                    </div>
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}><Edit2 size={16} /></button>
                 </div>
              </div>
           ))}
        </div>
      )}

      </div>

      {/* Modal / Panel Superpuesto Registro Retos */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '600px', background: 'var(--bg-dark)', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
             
             {/* Header */}
             <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <Trophy color="var(--accent-primary)" /> Forjar Micro-Reto
                </h2>
                <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <X />
                </button>
             </div>

             {/* Body */}
             <div style={{ padding: '24px', overflowY: 'auto' }}>
                <form onSubmit={handleSaveChallenge}>
                  
                  <div className="input-group">
                     <label className="input-label">Título Atractivo</label>
                     <input 
                       type="text" 
                       className="input-field" 
                       value={formData.title}
                       onChange={(e)=>setFormData({...formData, title: e.target.value})}
                       placeholder="Ej: Técnicas efectivas para venta cruzada..." 
                       required
                       autoFocus
                     />
                  </div>

                  <div className="input-group">
                     <label className="input-label">Instrucciones o Lectura del Reto</label>
                     <textarea 
                       className="input-field" 
                       value={formData.description}
                       onChange={(e)=>setFormData({...formData, description: e.target.value})}
                       placeholder="Explica qué debe aprender o contestar el asesor..."
                       rows={3}
                       required
                       style={{ resize: 'vertical' }}
                     />
                  </div>

                  <div className="input-group">
                     <label className="input-label">Enlace URL (Video Soporte, Imagen) - Opcional</label>
                     <input 
                       type="url" 
                       className="input-field" 
                       value={formData.content_url}
                       onChange={(e)=>setFormData({...formData, content_url: e.target.value})}
                       placeholder="https://youtube.com/..." 
                     />
                  </div>

                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                     <div className="input-group" style={{ flex: 1 }}>
                        <label className="input-label">Público Destino</label>
                        <select 
                           className="input-field" 
                           value={formData.role_target}
                           onChange={(e)=>setFormData({...formData, role_target: e.target.value})}
                        >
                           <option value="">Todas las áreas</option>
                           <option value="asesor">Solo Asesores</option>
                           <option value="cajero">Solo Cajeros</option>
                           <option value="bodeguero">Solo Bodegueros</option>
                        </select>
                     </div>

                     <div className="input-group" style={{ flex: 1 }}>
                        <label className="input-label">Fecha Límite</label>
                        <input 
                           type="date"
                           className="input-field" 
                           value={formData.end_date}
                           onChange={(e)=>setFormData({...formData, end_date: e.target.value})}
                           min={formData.active_date}
                           required
                        />
                     </div>
                  </div>

                  <div style={{ display: 'flex', gap: '32px', marginBottom: '32px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input 
                           type="checkbox" 
                           checked={formData.is_flash}
                           onChange={(e)=>setFormData({...formData, is_flash: e.target.checked})}
                           style={{ width: '20px', height: '20px', accentColor: 'var(--accent-primary)' }}
                        />
                        <div>
                           <div style={{ fontWeight: 'bold' }}>⚡ Trivia Exprés (Con Tiempo)</div>
                           <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>El celular castigará al asesor dándole solo 20s para decidir.</div>
                        </div>
                     </label>

                     <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input 
                           type="checkbox" 
                           checked={formData.is_live}
                           onChange={(e)=>setFormData({...formData, is_live: e.target.checked})}
                           style={{ width: '20px', height: '20px', accentColor: '#ff1493' }}
                        />
                        <div>
                           <div style={{ fontWeight: 'bold', color: '#ff1493' }}>🔴 RETO EN VIVO (Alerta Interrumptora)</div>
                           <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Se apoderará forzosamente de las pantallas de la tienda instantáneamente.</div>
                        </div>
                     </label>
                  </div>

                  {/* ZONA DE QUIZ DE EVALUACIÓN MÚLTIPLE */}
                  <div style={{ padding: '16px', background: 'rgba(50,50,250,0.05)', borderRadius: '12px', border: '1px solid rgba(50,100,255,0.2)', marginBottom: '16px' }}>
                     <h3 style={{ fontSize: '1rem', color: 'var(--accent-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                        Módulo de Examen (Test Formal)
                        <button type="button" onClick={() => setFormData({...formData, quiz_questions: [...formData.quiz_questions, { question: '', opt0: '', opt1: '', opt2: '', correct: 0 }]})} style={{ background: 'var(--accent-primary)', border: 'none', color: '#000', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>+ Añadir Pregunta</button>
                     </h3>
                     <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Puedes añadir tantas preguntas como desees (Recomendado: 5). Todas deberán ser aprobadas.</p>
                     
                     {formData.quiz_questions.map((q, idx) => (
                        <div key={idx} style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', marginBottom: '12px' }}>
                           <p style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', marginBottom: '8px', fontWeight: 600 }}>Pregunta #{idx + 1}</p>
                           <div className="input-group">
                             <input className="input-field" type="text" placeholder="¿Pregunta evaluar?" value={q.question} onChange={e => { const newQ = [...formData.quiz_questions]; newQ[idx].question = e.target.value; setFormData({...formData, quiz_questions: newQ})}} />
                           </div>

                           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                              <div><input className="input-field" placeholder="Opción 0" value={q.opt0} onChange={e => { const newQ = [...formData.quiz_questions]; newQ[idx].opt0 = e.target.value; setFormData({...formData, quiz_questions: newQ})}}/></div>
                              <div><input className="input-field" placeholder="Opción 1" value={q.opt1} onChange={e => { const newQ = [...formData.quiz_questions]; newQ[idx].opt1 = e.target.value; setFormData({...formData, quiz_questions: newQ})}}/></div>
                              <div><input className="input-field" placeholder="Opción 2" value={q.opt2} onChange={e => { const newQ = [...formData.quiz_questions]; newQ[idx].opt2 = e.target.value; setFormData({...formData, quiz_questions: newQ})}}/></div>
                           </div>

                           <div className="input-group" style={{ marginTop: '12px' }}>
                             <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Índice de la Opc. Correcta:</label>
                             <select className="input-field" value={q.correct} onChange={e => { const newQ = [...formData.quiz_questions]; newQ[idx].correct = e.target.value; setFormData({...formData, quiz_questions: newQ})}}>
                                <option value={0}>Opción 0</option>
                                <option value={1}>Opción 1</option>
                                <option value={2}>Opción 2</option>
                             </select>
                           </div>
                        </div>
                     ))}
                  </div>

                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                     <div className="input-group" style={{ flex: 1 }}>
                        <label className="input-label text-gradient" style={{ fontWeight: 800 }}>XP Ganada</label>
                        <input 
                           type="number"
                           min="1"
                           className="input-field" 
                           value={formData.reward_xp}
                           onChange={(e)=>setFormData({...formData, reward_xp: e.target.value})}
                           required
                        />
                     </div>

                     <div className="input-group" style={{ flex: 1 }}>
                        <label className="input-label" style={{ color: 'var(--accent-warning)', fontWeight: 800 }}>FitCoins Ganados</label>
                        <input 
                           type="number"
                           min="0"
                           className="input-field" 
                           value={formData.reward_fitcoins}
                           onChange={(e)=>setFormData({...formData, reward_fitcoins: e.target.value})}
                           required
                        />
                     </div>
                  </div>

                  {errorObj && <p style={{ color: 'var(--accent-danger)', marginBottom: '16px', fontSize: '0.9rem' }}>{errorObj}</p>}
                  
                  <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                     <button type="submit" className="btn-primary" disabled={isSaving} style={{ flex: 1 }}>
                       {isSaving ? <Loader2 className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18}/>}
                       {isSaving ? ' Publicando...' : ' Publicar Reto de Tienda'}
                     </button>
                  </div>

                </form>
             </div>

             <style>{`
               @keyframes spin { 100% { transform: rotate(360deg); } }
               select option { background: var(--bg-dark); color: #fff; }
             `}</style>
          </div>
        </div>
      )}
    </>
  );
}
