import React, { useState, useEffect } from 'react';
import { Store, Users, Award, Target, Loader2, ChevronRight, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function StoreDetail() {
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingColabs, setFetchingColabs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchStores() {
      const { data, error } = await supabase.from('stores').select('*').order('name');
      if (!error && data) {
        setStores(data);
        if (data.length > 0) {
          setSelectedStoreId(data[0].id);
        }
      }
      setLoading(false);
    }
    fetchStores();
  }, []);

  useEffect(() => {
    if (selectedStoreId) {
      fetchCollaborators();
    }
  }, [selectedStoreId]);

  async function fetchCollaborators() {
    setFetchingColabs(true);
    try {
      // Obtenemos perfiles y sus retos completados
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('store_id', selectedStoreId);

      if (profError) throw profError;

      const { data: progress, error: progError } = await supabase
        .from('user_progress')
        .select('user_id');

      if (progError) throw progError;

      const enriched = (profiles || []).map(p => ({
        ...p,
        completedChallenges: (progress || []).filter(pr => pr.user_id === p.id).length
      })).sort((a, b) => (b.current_xp + b.fitcoins) - (a.current_xp + a.fitcoins));

      setCollaborators(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingColabs(false);
    }
  }

  const filteredColabs = collaborators.filter(c => 
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '60vh' }}><Loader2 className="animate-spin" size={40} color="var(--accent-primary)" /></div>;
  }

  const selectedStore = stores.find(s => s.id === selectedStoreId);

  return (
    <div className="animate-fade-in">
      <div className="header-action">
        <div>
          <h1 className="text-gradient">Detalle por Tienda</h1>
          <p className="text-muted" style={{ marginTop: '4px' }}>Visualiza el progreso específico de cada sucursal</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <label className="input-label">Seleccionar Tienda / Sucursal</label>
          <div style={{ position: 'relative' }}>
            <Store size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
            <select 
              className="input-field" 
              style={{ paddingLeft: '40px' }}
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
            >
              {stores.map(s => <option key={s.id} value={s.id}>{s.name} - {s.location}</option>)}
            </select>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '250px' }}>
          <label className="input-label">Buscar Colaborador</label>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input-field" 
              style={{ paddingLeft: '40px' }}
              placeholder="Nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {fetchingColabs ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="animate-spin" size={32} color="var(--accent-primary)" /></div>
      ) : (
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Equipo: {selectedStore?.name}</h2>
            <span className="badge primary">{filteredColabs.length} Colaboradores</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)', textAlign: 'left' }}>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>COLABORADOR</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>ROL</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>DESEMPEÑO</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>RETOS</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>NIVEL</th>
                </tr>
              </thead>
              <tbody>
                {filteredColabs.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron colaboradores para esta tienda.</td></tr>
                ) : filteredColabs.map((colab, idx) => (
                  <tr key={colab.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }} className="hover-row">
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', display: 'grid', placeItems: 'center', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                          {colab.full_name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{colab.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{colab.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{colab.role}</span>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-warning)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                          <Award size={14} /> {colab.fitcoins || 0}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                          <TrendingUpIcon size={14} /> {colab.current_xp || 0}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Target size={14} className="text-muted" />
                        <span style={{ fontSize: '0.9rem' }}>{colab.completedChallenges} completados</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                       <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-dark)', display: 'grid', placeItems: 'center', fontWeight: 'bold', border: '1px solid var(--accent-secondary)', color: 'var(--accent-secondary)' }}>
                          {colab.current_level || 1}
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        .hover-row:hover { background: rgba(255,255,255,0.02); }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function TrendingUpIcon({size, color}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
}
