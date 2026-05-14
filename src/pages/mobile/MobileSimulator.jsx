import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Bot, Send, Loader2, ChevronRight, CheckCircle2, Lock, ArrowLeft, Zap } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { respondAsCustomer } from '../../lib/ai';

export default function MobileSimulator() {
  const { profile } = useAuth();

  // VISTA: 'list' | 'chat'
  const [view, setView] = useState('list');
  const [simulations, setSimulations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  // Estado del chat activo
  const [scenario, setScenario] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [rewarding, setRewarding] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [firstAttemptBurned, setFirstAttemptBurned] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    loadSimList();
  }, [profile]);

  async function loadSimList() {
    if (!profile?.id) return;
    setLoadingList(true);
    const todayRaw = new Date().toISOString().split('T')[0];

    const { data: sims } = await supabase.from('simulations')
      .select('*')
      .lte('active_date', todayRaw)
      .gte('end_date', todayRaw)
      .order('active_date', { ascending: true });

    if (!sims || sims.length === 0) { setSimulations([]); setLoadingList(false); return; }

    // Ver cuáles ya completó
    const { data: progress } = await supabase.from('user_simulation_progress')
      .select('simulation_id')
      .eq('user_id', profile.id)
      .in('simulation_id', sims.map(s => s.id));

    const completedIds = new Set((progress || []).map(p => p.simulation_id));

    setSimulations(sims.map(s => ({ ...s, isCompleted: completedIds.has(s.id) })));
    setLoadingList(false);
  }

  async function openSim(sim) {
    setScenario(sim);
    setIsCompleted(false);
    setFirstAttemptBurned(false);
    setInputMsg('');

    if (sim.isCompleted) {
      setIsLocked(true);
      setMessages([]);
    } else {
      setIsLocked(false);
      setMessages([
        { sender: 'system', text: `Iniciando escenario: ${sim.title}. ⚠️ Tienes un solo intento. Al enviar tu primer mensaje se bloquearán los reintentos.` },
        { sender: 'bot', text: `*El cliente entra a la tienda con actitud: ${sim.ai_persona}*` },
        { sender: 'bot', text: '¡Hola! Necesito ayuda por favor. ¿Alguien me puede atender?' }
      ]);
    }
    setView('chat');
  }

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || isTyping) return;
    const userText = inputMsg;
    const snapshotHistory = [...messages];
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInputMsg('');
    setIsTyping(true);

    if (!firstAttemptBurned) {
      setFirstAttemptBurned(true);
      try {
        await supabase.from('user_simulation_progress').insert({ user_id: profile.id, simulation_id: scenario.id });
      } catch (_) {}
    }

    const aiResponse = await respondAsCustomer(scenario, snapshotHistory, userText);
    setMessages(prev => [...prev, { sender: 'bot', text: aiResponse.reply }]);
    setIsTyping(false);

    if (aiResponse.completed) {
      setIsCompleted(true);
      setMessages(prev => [...prev, { sender: 'system', text: '¡Venta lograda! El cliente está satisfecho con tus respuestas.' }]);
    }
  };

  const handleClaimReward = async () => {
    setRewarding(true);
    const newXp = (profile.current_xp || 0) + scenario.reward_xp;
    const newCoins = (profile.fitcoins || 0) + 15;
    await supabase.from('profiles').update({ current_xp: newXp, fitcoins: newCoins }).eq('id', profile.id);
    setRewarding(false);
    setMessages(prev => [...prev, { sender: 'system', text: `¡Felicidades! Has ganado +${scenario.reward_xp} XP y +15 FitCoins.` }]);
    setIsCompleted(false);
    // Actualizar lista al volver
    setSimulations(prev => prev.map(s => s.id === scenario.id ? { ...s, isCompleted: true } : s));
  };

  // ─── VISTA: LISTA ───────────────────────────────────────────
  if (view === 'list') {
    const pending = simulations.filter(s => !s.isCompleted);
    const done = simulations.filter(s => s.isCompleted);

    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px 20px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }} className="text-gradient">
            <Bot size={24} /> Simulador IA
          </h1>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>Completa cada escenario para ganar XP</p>
        </div>

        {loadingList ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 size={32} className="animate-spin text-accent-primary" style={{ margin: '0 auto' }} /></div>
        ) : simulations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Bot size={48} style={{ margin: '0 auto 16px', color: 'var(--text-muted)' }} />
            <p className="text-muted">No hay simulaciones activas en este momento.</p>
          </div>
        ) : (
          <>
            {/* PENDIENTES */}
            {pending.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Pendientes ({pending.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pending.map(sim => (
                    <div key={sim.id} onClick={() => openSim(sim)} style={{
                      background: 'linear-gradient(135deg, rgba(112,0,255,0.15) 0%, rgba(0,240,255,0.05) 100%)',
                      border: '1px solid rgba(0,240,255,0.3)',
                      borderRadius: '20px',
                      padding: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'center'
                    }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(0,240,255,0.1)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <Bot size={24} color="var(--accent-primary)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>{sim.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {sim.description}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>+{sim.reward_xp} XP</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-warning)', fontWeight: 600 }}>+15 FC</span>
                        </div>
                      </div>
                      <ChevronRight size={20} color="var(--accent-primary)" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COMPLETADOS */}
            {done.length > 0 && (
              <div>
                <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Completados ({done.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {done.map(sim => (
                    <div key={sim.id} style={{
                      background: 'rgba(0,255,100,0.04)',
                      border: '1px solid rgba(0,255,100,0.15)',
                      borderRadius: '16px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      opacity: 0.7
                    }}>
                      <CheckCircle2 size={24} color="#00ff64" style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{sim.title}</div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#00ff64', fontWeight: 600 }}>Completado</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ─── VISTA: CHAT ────────────────────────────────────────────
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      <div style={{ background: 'linear-gradient(180deg, rgba(112,0,255,0.2) 0%, rgba(0,0,0,0) 100%)', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => setView('list')} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Bot color="var(--accent-primary)" size={18} /> {scenario?.title}
          </h2>
          <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>
            {scenario?.evaluation_criteria?.[0] || 'Venta General'}
          </p>
        </div>
      </div>

      {isLocked ? (
        <div className="animate-fade-in" style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          <Lock size={64} style={{ margin: '0 auto', color: 'var(--accent-danger)' }} />
          <h2 style={{ color: 'var(--accent-danger)' }}>Ya completado</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>Ya utilizaste tu intento en esta simulación. Tu progreso quedó registrado.</p>
          <button onClick={() => setView('list')} className="btn-primary" style={{ justifyContent: 'center' }}>
            Ver otros simuladores
          </button>
        </div>
      ) : (
        <>
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
                {msg.sender === 'system' && <strong style={{ color: 'var(--accent-primary)' }}>SISTEMA: </strong>}
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
              <button onClick={handleClaimReward} disabled={rewarding} className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #00f0ff, #7000ff)', gap: '8px' }}>
                <Zap size={18} /> {rewarding ? 'Verificando...' : `Reclamar +${scenario?.reward_xp} XP`}
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
                <button type="submit" disabled={isTyping} style={{ background: isTyping ? 'rgba(255,255,255,0.1)' : 'var(--accent-primary)', border: 'none', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', cursor: isTyping ? 'not-allowed' : 'pointer' }}>
                  <Send size={18} style={{ transform: 'translateX(-1px)' }} />
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
