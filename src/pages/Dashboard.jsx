import React, { useState, useEffect } from 'react';
import { Activity, Users, TrendingUp, Target, Award, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({ users: 0, challenges: 0, sims: 0 });
  const [stores, setStores] = useState([]);
  const [topProfiles, setTopProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      // Optimizamos extrayendo conteos básicos
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: chalCount } = await supabase.from('daily_challenges').select('*', { count: 'exact', head: true });
      const { count: simsCount } = await supabase.from('simulations').select('*', { count: 'exact', head: true });
      
      const { data: storesList } = await supabase.from('stores').select('*');
      const { data: profilesList } = await supabase.from('profiles').select('id, store_id, current_xp, fitcoins, full_name, role');

      let computedStores = [];
      let computedEmployees = [];

      if (storesList && profilesList) {
         // Lógica para Sucursales
         computedStores = storesList.map(st => {
            const employees = profilesList.filter(p => p.store_id === st.id);
            const totalXp = employees.reduce((sum, e) => sum + (e.current_xp || 0), 0);
            const totalFc = employees.reduce((sum, e) => sum + (e.fitcoins || 0), 0);
            return { ...st, xp: totalXp, fc: totalFc };
         });
         computedStores.sort((a, b) => (b.xp + b.fc) - (a.xp + a.fc));

         // Lógica para Empleados Individuales Estrellas
         computedEmployees = [...profilesList].sort((a, b) => 
            ((b.current_xp || 0) + (b.fitcoins || 0)) - ((a.current_xp || 0) + (a.fitcoins || 0))
         );
      }

      setMetrics({
         users: usersCount || 0,
         challenges: chalCount || 0,
         sims: simsCount || 0
      });
      setStores(computedStores.slice(0, 10));
      setTopProfiles(computedEmployees.slice(0, 10));
      setLoading(false);
    }
    fetchDashboard();
  }, []);

  if (loading) {
     return <div style={{ display: 'grid', placeItems: 'center', height: '60vh', color: 'var(--accent-primary)' }}><Loader2 size={40} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /></div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="header-action">
        <div>
          <h1 className="text-gradient">Dashboard General</h1>
          <p className="text-muted" style={{ marginTop: '4px' }}>Métricas de tu fuerza de ventas extraídas desde Supabase</p>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: '32px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="text-muted" style={{ fontSize: '1rem', fontWeight: 500 }}>Asesores Registrados</h3>
            <Users size={20} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{metrics.users}</div>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="text-muted" style={{ fontSize: '1rem', fontWeight: 500 }}>Retos Publicados</h3>
            <Target size={20} color="var(--accent-secondary)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{metrics.challenges}</div>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="text-muted" style={{ fontSize: '1rem', fontWeight: 500 }}>Escenarios IA</h3>
            <BotIcon size={20} color="var(--accent-warning)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{metrics.sims}</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ marginBottom: '24px' }}>Tiendas Activas</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {stores.length === 0 ? <p className="text-muted">Aún no hay tiendas creadas en DB</p> : null}
            {stores.map((store, i) => (
              <div key={store.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: i === 0 ? 'var(--accent-warning)' : 'var(--bg-card)', display: 'grid', placeItems: 'center', fontWeight: 'bold', color: i === 0 ? '#000' : '#fff' }}>
                    {i+1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{store.name} {i === 0 && '👑'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{store.location}</div>
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                   <div style={{ display: 'flex', gap: '8px', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--accent-warning)', fontWeight: 600 }}>{store.fc} FC</span>
                      <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{store.xp} XP</span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
           <h2 style={{ marginBottom: '24px' }}>Top Asesores (Ranking)</h2>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
             {topProfiles.length === 0 ? <p className="text-muted">No existen empleados suficientes.</p> : null}
             {topProfiles.map((p, i) => (
                <div key={p.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: i === 0 ? 'var(--accent-primary)' : 'var(--bg-card)', display: 'grid', placeItems: 'center', fontWeight: 'bold', color: i === 0 ? '#000' : '#fff' }}>
                           {i+1}
                        </div>
                        <div>
                            <div style={{ fontWeight: 600 }}>{p.full_name} {i === 0 && '🌟'}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{p.role}</div>
                        </div>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '0.85rem' }}>
                         <span style={{ color: 'var(--accent-warning)', fontWeight: 600 }}>{p.fitcoins || 0} FC</span>
                         <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{p.current_xp || 0} XP</span>
                      </div>
                   </div>
                </div>
             ))}
           </div>
        </div>
      </div>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Inline helper for Bot icon
function BotIcon({size, color}) {
   return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>;
}
