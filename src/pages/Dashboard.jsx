import React, { useState, useEffect } from 'react';
import { Activity, Users, TrendingUp, Target, Award, Loader2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { utils, writeFile } from 'xlsx';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({ users: 0, challenges: 0, sims: 0 });
  const [stores, setStores] = useState([]);
  const [topProfiles, setTopProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States para Carga Masiva
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkLog, setBulkLog] = useState('');

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

  const handleUpdateKPI = async (storeId) => {
     const store = stores.find(s => s.id === storeId);
     const goal = prompt("Ingresa la META DE VENTAS (Ej: 1000000):", store?.monthly_sales_goal || "1000000");
     const current = prompt("Ingresa la VENTA ACTUAL (Ej: 500000):", store?.current_sales || "500000");
     
     if (goal && current) {
         setLoading(true);
         const numGoal = parseInt(goal);
         const numCurrent = parseInt(current);

         await supabase.from('stores').update({
             monthly_sales_goal: numGoal,
             current_sales: numCurrent 
         }).eq('id', storeId);

         // Lógica del Motor Lluvia de FitCoins (Cruce de límite)
         const wasBelow = (!store?.current_sales || !store?.monthly_sales_goal) || (store.current_sales < store.monthly_sales_goal);
         const isAbove = numCurrent >= numGoal;

         if (wasBelow && isAbove) {
             const { data: employees } = await supabase.from('profiles').select('id, fitcoins').eq('store_id', storeId);
             if (employees && employees.length > 0) {
                 const updates = employees.map(emp => 
                    supabase.from('profiles').update({ fitcoins: (emp.fitcoins || 0) + 150 }).eq('id', emp.id)
                 );
                 await Promise.all(updates);
                 alert(`🎉 ¡META CRUZADA! Lluvia de Recompensas activada.\nSe han transferido +150 FitCoins automáticamente a las cuentas de los ${employees.length} empleados de esta tienda.`);
             }
         }

         window.location.reload();
     }
  };

  const handleBulkUpload = async () => {
      if (!bulkText.trim()) return;
      setLoading(true);
      setBulkLog('Procesando datos desde el portapapeles...\n');
      
      const rows = bulkText.split('\n');
      let successCount = 0;
      let errorCount = 0;
      let rewardCount = 0;

      for (let i = 0; i < rows.length; i++) {
          const row = rows[i].trim();
          if (!row) continue;
          
          // La separación por defecto al pegar desde Excel es tabulación (\t)
          const cols = row.split('\t');
          if (cols.length < 3) {
             errorCount++;
             continue; // Ignorar filas rotas o mal pegadas
          }

          const rawStoreName = cols[0].trim();
          const goal = parseInt(cols[1].toString().replace(/\D/g, '')); // Remover formatos de moneda $ o puntos 
          const current = parseInt(cols[2].toString().replace(/\D/g, ''));

          // Empatar nombre exacto (case-insensitive)
          const store = stores.find(s => s.name.toLowerCase().trim() === rawStoreName.toLowerCase());

          if (store && !isNaN(goal) && !isNaN(current)) {
              // 1. Guardar Nuevas Cifras
              await supabase.from('stores').update({
                  monthly_sales_goal: goal,
                  current_sales: current 
              }).eq('id', store.id);
              
              // 2. Lógica Lluvia Monedas!
              const wasBelow = (!store.current_sales || !store.monthly_sales_goal) || (store.current_sales < store.monthly_sales_goal);
              const isAbove = current >= goal;

              if (wasBelow && isAbove) {
                  const { data: employees } = await supabase.from('profiles').select('id, fitcoins').eq('store_id', store.id);
                  if (employees && employees.length > 0) {
                      const updates = employees.map(emp => 
                         supabase.from('profiles').update({ fitcoins: (emp.fitcoins || 0) + 150 }).eq('id', emp.id)
                      );
                      await Promise.all(updates);
                      rewardCount++;
                  }
              }
              successCount++;
          } else {
              errorCount++;
          }
      }
      
      alert(`🎉 Carga Masiva Completada\n\n- Tiendas Actualizadas: ${successCount}\n- Tiendas que cruzaron meta ahora y ganaron bonos: ${rewardCount}\n- Errores/Ignorados: ${errorCount}`);
      window.location.reload();
  };

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
        <button onClick={async () => {
          setLoading(true);
          try {
            const { data: profiles } = await supabase.from('profiles').select('*, stores(name)');
            const { data: progress } = await supabase.from('user_progress').select('user_id');
            const { data: storesList } = await supabase.from('stores').select('*');

            // Procesar Colaboradores
            const colabsData = (profiles || []).map(p => {
              const completions = (progress || []).filter(pr => pr.user_id === p.id).length;
              return {
                'Nombre Completo': p.full_name,
                'Email': p.email,
                'Rol': p.role,
                'Tienda': p.stores?.name || 'N/A',
                'XP Total': p.current_xp || 0,
                'FitCoins': p.fitcoins || 0,
                'Nivel Actual': p.current_level || 1,
                'Retos Completados': completions,
                'Racha (Días)': p.streak_days || 0,
                'Fecha Registro': new Date(p.created_at).toLocaleDateString()
              };
            });

            // Procesar Tiendas
            const tiendasData = (storesList || []).map(st => {
              const employees = (profiles || []).filter(p => p.store_id === st.id);
              const totalXp = employees.reduce((sum, e) => sum + (e.current_xp || 0), 0);
              const totalFc = employees.reduce((sum, e) => sum + (e.fitcoins || 0), 0);
              const avgLevel = employees.length > 0 ? (employees.reduce((sum, e) => sum + (e.current_level || 1), 0) / employees.length).toFixed(1) : 0;
              
              return {
                'Nombre Tienda': st.name,
                'Ubicación': st.location,
                'Colaboradores': employees.length,
                'XP Acumulada': totalXp,
                'FitCoins Acumulados': totalFc,
                'Nivel Promedio': avgLevel,
                'Venta Mensual Goal': st.monthly_sales_goal || 0,
                'Venta Actual': st.current_sales || 0,
                '% Cumplimiento': st.monthly_sales_goal ? ((st.current_sales / st.monthly_sales_goal) * 100).toFixed(1) + '%' : '0%'
              };
            });

            const wb = utils.book_new();
            const wsColabs = utils.json_to_sheet(colabsData);
            const wsTiendas = utils.json_to_sheet(tiendasData);
            
            utils.book_append_sheet(wb, wsColabs, "Colaboradores");
            utils.book_append_sheet(wb, wsTiendas, "Tiendas");
            
            writeFile(wb, `Reporte_Desempeño_Coach_${new Date().toISOString().split('T')[0]}.xlsx`);
          } catch (err) {
            console.error(err);
            alert("Error al generar el reporte");
          } finally {
            setLoading(false);
          }
        }} className="btn-primary" style={{ background: 'var(--accent-secondary)', color: '#000' }}>
          <Download size={18} /> Descargar Reporte Excel
        </button>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
             <h2 style={{ margin: 0 }}>Ranking Tiendas Activas</h2>
             <button onClick={() => setIsBulkOpen(true)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Excel Básico (Masivo)</button>
          </div>
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
                
                <div style={{ textAlign: 'right', display: 'flex', gap: '16px', alignItems: 'center' }}>
                   <button onClick={() => handleUpdateKPI(store.id)} style={{ background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
                       Fijar KPI
                   </button>
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

      {isBulkOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '700px', background: 'var(--bg-dark)', padding: '32px', display: 'flex', flexDirection: 'column' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.4rem', color: '#00f0ff' }}>Ingesta Masiva desde Excel</h2>
                <button onClick={() => setIsBulkOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
             </div>

             <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                 <strong>¿Cómo funciona?</strong><br/>
                 Ve a tu Excel. Sombrea las filas que contengan estas 3 columnas en orden estricto: <br/>
                 <code style={{background: '#000', padding: '4px', borderRadius: '4px'}}>NOMBRE DE TIENDA</code> | <code style={{background: '#000', padding: '4px', borderRadius: '4px'}}>META MENSUAL</code> | <code style={{background: '#000', padding: '4px', borderRadius: '4px'}}>LO VENDIDO</code><br/>
                 Márcalo todo, dale a <b>Copiar (Ctrl+C)</b>, pon tu cursor aquí abajo, y dale <b>Pegar (Ctrl+V)</b>.
             </div>
             
             <textarea 
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Pega las celdas desde Excel aquí..."
                style={{ 
                    width: '100%', height: '200px', background: 'var(--bg-card)', 
                    border: '1px solid var(--accent-primary)', borderRadius: '12px', 
                    padding: '16px', color: '#fff', fontSize: '0.9rem',
                    fontFamily: 'monospace', resize: 'vertical', marginBottom: '24px'
                }}
             />

             <button onClick={handleBulkUpload} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '1.1rem' }}>
                🚀 Procesar y Repartir Bonos
             </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Inline helper for Bot icon
function BotIcon({size, color}) {
   return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>;
}
