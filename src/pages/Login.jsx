import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Activity } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('admin@marathon.cl');
  const [password, setPassword] = useState('admin123'); // Password mock o para setup posterior
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
        // 1. Intento MODO ADMINISTRADOR (GoTrue)
        const { error: authErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authErr) {
            // 2. Falló, Intento MODO ASESOR LOCAL (Tabla general)
            const { data: profData, error: profErr } = await supabase
               .from('profiles')
               .select('*')
               .eq('email', email)
               .eq('password', password)
               .single();
               
            if (!profData || profErr) {
               throw new Error('Credenciales inválidas o no encontradas en el sistema.');
            } else {
               // Exitoso como Vendedor Local! Puentear el Context y redirigir
               localStorage.setItem('custom_session', JSON.stringify(profData));
               window.location.href = '/app/home';
               return; // Salir aquí
            }
        }
        // Si no hubo Auth error, el AuthContext se encargará de redirigir al Dashboard Central
    } catch (err) {
        setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: '400px', margin: 'auto' }} className="animate-fade-in">
          
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(0, 240, 255, 0.1)', marginBottom: '16px' }}>
              <Activity size={32} color="var(--accent-primary)" />
            </div>
            <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Coach <span className="text-gradient">Retail</span></h1>
            <p className="text-muted">Panel de Administración</p>
          </div>

          <form onSubmit={handleLogin} className="glass-panel" style={{ padding: '32px' }}>
            {error && (
               <div style={{ background: 'rgba(255, 0, 85, 0.1)', color: 'var(--accent-danger)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
                  {error}
               </div>
            )}
            
            <div className="input-group">
              <label className="input-label">Correo Electrónico</label>
              <input 
                type="email" 
                className="input-field" 
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                placeholder="admin@empresa.com" 
                required
              />
            </div>

            <div className="input-group" style={{ marginBottom: '32px' }}>
              <label className="input-label">Contraseña</label>
              <input 
                type="password" 
                className="input-field" 
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                placeholder="••••••••" 
                required
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Iniciando...' : 'Ingresar al Panel'}
            </button>
          </form>

        </div>
      </div>
      <div style={{ 
          flex: 1, 
          background: 'linear-gradient(135deg, rgba(15,17,21,0.5), rgba(0,240,255,0.05)), url("https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderLeft: '1px solid var(--glass-border)',
          display: 'none' // Se oculta en móviles
        }} 
        className="login-side-image"
      />
      <style>{`
        @media (min-width: 900px) {
           .login-side-image { display: block !important; }
        }
      `}</style>
    </div>
  );
}
