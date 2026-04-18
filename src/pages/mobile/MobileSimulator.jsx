import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Bot, Send, User, Loader2 } from 'lucide-react';

import { useAuth } from '../../lib/AuthContext';
import { respondAsCustomer } from '../../lib/ai';

export default function MobileSimulator() {
  const { profile } = useAuth();
  const [scenario, setScenario] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [rewarding, setRewarding] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    async function loadLatestScenario() {
       const { data } = await supabase.from('simulations').select('*').order('created_at', { ascending: false }).limit(1);
       if (data && data.length > 0) {
           setScenario(data[0]);
           setMessages([
              { sender: 'system', text: `Iniciando escenario: ${data[0].title}` },
              { sender: 'bot', text: `*El cliente entra a la tienda con actitud: ${data[0].ai_persona}*` },
              { sender: 'bot', text: '¡Hola! Necesito ayuda por favor. ¿Alguien me puede atender?' }
           ]);
       }
    }
    loadLatestScenario();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || isTyping) return;
    
    const userText = inputMsg;
    // Agregamos respuesta del usuario de inmediato en la UI
    const snapshotHistory = [...messages]; // Lo que existía antes de enviar
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInputMsg("");
    setIsTyping(true);
    
    // Enviar a Cerebro IA para evaluar la conversación
    const aiResponse = await respondAsCustomer(scenario, snapshotHistory, userText);
    
    // Añadimos la respuesta
    setMessages(prev => [...prev, { sender: 'bot', text: aiResponse.reply }]);
    setIsTyping(false);

    // Verificamos si completamos los criterios según el juez
    if (aiResponse.completed) {
        setIsCompleted(true);
        setMessages(prev => [...prev, { sender: 'system', text: '¡Venta lograda! El cliente está satisfecho con tus respuestas.' }]);
    }
  };

  const handleClaimReward = async () => {
     setRewarding(true);
     // Recompensa matemática
     const newXp = (profile.current_xp || 0) + scenario.reward_xp;
     const newCoins = (profile.fitcoins || 0) + 15; // estático para simulación
     
     await supabase.from('profiles').update({
        current_xp: newXp,
        fitcoins: newCoins
     }).eq('id', profile.id);

     setRewarding(false);
     setMessages(prev => [...prev, { sender: 'system', text: `¡Felicidades! Has ganado +${scenario.reward_xp} XP y +15 FitCoins.` }]);
     setIsCompleted(false); // Quita el botón
  };

  if (!scenario) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando inteligencia artificial...</div>;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
       
       <div style={{ background: 'linear-gradient(180deg, rgba(112,0,255,0.2) 0%, rgba(0,0,0,0) 100%)', padding: '24px 20px 16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
           <h2 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot color="var(--accent-primary)" /> Cliente Virtual
           </h2>
           <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>Criterio Activo: {scenario.evaluation_criteria[0] || 'Venta General'}</p>
       </div>

       <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
           {messages.map((msg, i) => (
               <div key={i} style={{ 
                   alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                   maxWidth: '85%',
                   background: msg.sender === 'user' ? 'var(--accent-primary)' : msg.sender === 'system' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.6)',
                   border: msg.sender === 'system' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                   padding: '12px 16px',
                   borderRadius: '16px',
                   borderBottomRightRadius: msg.sender === 'user' ? '4px' : '16px',
                   borderBottomLeftRadius: msg.sender === 'bot' ? '4px' : '16px',
                   color: msg.sender === 'user' ? '#000' : '#fff',
                   fontWeight: msg.sender === 'user' ? 600 : 400,
                   fontSize: '0.9rem',
                   textAlign: msg.sender === 'system' ? 'center' : 'left'
               }}>
                   {msg.sender === 'system' && <strong style={{color:'var(--accent-primary)'}}>SISTEMA: </strong>}
                   {msg.text}
               </div>
           ))}
           {isTyping && (
               <div style={{ alignSelf: 'flex-start', background: 'rgba(0,0,0,0.6)', padding: '12px 16px', borderRadius: '16px', color: '#fff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <Loader2 size={14} className="animate-spin" /> Escribiendo...
               </div>
           )}
       </div>

       <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'var(--bg-dark)' }}>
           {isCompleted ? (
              <button onClick={handleClaimReward} disabled={rewarding} className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #00f0ff, #7000ff)' }}>
                 {rewarding ? 'Verificando...' : `Reclamar +${scenario.reward_xp} XP`}
              </button>
           ) : (
             <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px' }}>
                <input 
                   type="text" 
                   value={inputMsg}
                   onChange={(e) => setInputMsg(e.target.value)}
                   placeholder="¿Qué le responderías?"
                   className="input-field"
                   style={{ margin: 0, flex: 1, borderRadius: '24px', paddingLeft: '20px' }}
                   disabled={isTyping}
                />
                <button type="submit" disabled={isTyping} style={{ background: isTyping ? 'rgba(255,255,255,0.1)' : 'var(--accent-primary)', border: 'none', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', cursor: isTyping ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                    <Send size={18} style={{ transform: 'translateX(-1px)' }} />
                </button>
             </form>
           )}
       </div>
    </div>
  );
}
