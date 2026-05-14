import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { Sparkles, Send, Loader2, BookOpen, AlertCircle } from 'lucide-react';

// Función para llamar a la IA con contexto de documentos
async function askAssistant(question, docsContext, history) {
  const systemPrompt = `Eres un asistente de ayuda interna para colaboradores de Marathon Sports.
Tu función es responder preguntas ÚNICAMENTE basándote en la siguiente base de conocimiento interna.
Si la respuesta no está en los documentos, di claramente: "No encontré información sobre eso en los documentos disponibles."
No inventes información. Sé conciso, claro y útil.

--- BASE DE CONOCIMIENTO ---
${docsContext}
--- FIN DE LA BASE DE CONOCIMIENTO ---`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: question }
  ];

  const isDev = import.meta.env.DEV;
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (isDev) {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3,
    });
    return res.choices[0].message.content;
  } else {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature: 0.3 })
    });
    const data = await res.json();
    return data.choices[0].message.content;
  }
}

export default function MobileAssistant() {
  const { profile } = useAuth();
  const [hasDocs, setHasDocs] = useState(null);
  const [docsContext, setDocsContext] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    loadDocs();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  async function loadDocs() {
    const { data } = await supabase.from('knowledge_documents')
      .select('title, content')
      .order('created_at', { ascending: false });

    if (!data || data.length === 0) {
      setHasDocs(false);
      return;
    }
    setHasDocs(true);
    // Construir contexto concatenando todos los documentos
    const context = data.map(d => `[Documento: ${d.title}]\n${d.content}`).join('\n\n---\n\n');
    setDocsContext(context);

    setMessages([{
      role: 'assistant',
      content: `¡Hola ${profile?.full_name?.split(' ')[0] || ''}! 👋 Soy tu Asistente. Tengo acceso a **${data.length} documento${data.length > 1 ? 's' : ''}** internos. ¿En qué puedo ayudarte hoy?`
    }]);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    const newHistory = [...messages, { role: 'user', content: userMsg }];
    setMessages(newHistory);
    setIsTyping(true);

    try {
      const reply = await askAssistant(userMsg, docsContext, messages);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Error al consultar el asistente. Intenta de nuevo.' }]);
    }
    setIsTyping(false);
  }

  // Sin documentos
  if (hasDocs === false) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '32px', textAlign: 'center' }}>
        <AlertCircle size={64} style={{ color: 'var(--accent-warning)', marginBottom: '24px' }} />
        <h2 style={{ fontSize: '1.3rem', marginBottom: '12px' }}>Sin documentos disponibles</h2>
        <p className="text-muted" style={{ lineHeight: 1.6 }}>Tu administrador aún no ha cargado documentos en la base de conocimiento. Consúltale para activar esta función.</p>
      </div>
    );
  }

  if (hasDocs === null) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-primary)' }} /></div>;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* CABECERA */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(0,240,255,0.15) 0%, transparent 100%)',
        padding: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', gap: '12px'
      }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--accent-primary), #7000ff)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Sparkles size={20} color="#fff" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Tu Asistente</h2>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <BookOpen size={12} /> Basado en documentos internos
          </p>
        </div>
      </div>

      {/* CHAT */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '88%',
            background: msg.role === 'user'
              ? 'var(--accent-primary)'
              : 'rgba(255,255,255,0.06)',
            border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)',
            padding: '12px 16px',
            borderRadius: '18px',
            borderBottomRightRadius: msg.role === 'user' ? '4px' : '18px',
            borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '18px',
            color: msg.role === 'user' ? '#000' : '#fff',
            fontSize: '0.9rem',
            lineHeight: 1.5,
            fontWeight: msg.role === 'user' ? 600 : 400,
            whiteSpace: 'pre-wrap'
          }}>
            {msg.content}
          </div>
        ))}

        {isTyping && (
          <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.06)', padding: '12px 16px', borderRadius: '18px', borderBottomLeftRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Loader2 size={14} className="animate-spin" /> Buscando en documentos...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'var(--bg-dark)' }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="¿Cuál es el procedimiento de...?"
            className="input-field"
            style={{ margin: 0, flex: 1, borderRadius: '24px', paddingLeft: '20px' }}
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={isTyping || !input.trim()}
            style={{
              background: isTyping || !input.trim() ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, var(--accent-primary), #7000ff)',
              border: 'none', width: '44px', height: '44px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: isTyping ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
            }}
          >
            <Send size={18} style={{ transform: 'translateX(-1px)' }} />
          </button>
        </form>
      </div>
    </div>
  );
}
