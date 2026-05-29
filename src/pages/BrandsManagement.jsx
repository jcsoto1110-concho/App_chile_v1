import React, { useState, useEffect } from 'react';
import { Plus, Loader2, Save, X, Settings, Edit2, Trash2, Store } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function BrandsManagement() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorObj, setErrorObj] = useState(null);
  
  const initialForm = { id: null, name: '', country: '', primary_color: '#004882', logo_url: '' };
  const [formData, setFormData] = useState(initialForm);

  // Stores management for a selected brand
  const [brandStores, setBrandStores] = useState([]);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [storeForm, setStoreForm] = useState({ id: null, name: '' });

  const STORAGE_KEY = 'brandFormData';

  // Load saved data when modal opens (for new brand)
  useEffect(() => {
    if (isModalOpen && !formData.id) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setFormData(JSON.parse(saved));
      }
    }
  }, [isModalOpen]);

  // Save form data on change while modal is open
  useEffect(() => {
    if (isModalOpen) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData, isModalOpen]);

  // ... rest of file unchanged up to handleSave

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
       navigate('/');
    }
  }, [isSuperAdmin, authLoading, navigate]);

  const fetchBrands = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('brands').select('*').order('created_at', { ascending: true });
    if (data) setBrands(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchBrands();
    }
  }, [isSuperAdmin]);

  const handleOpenModal = (brand = null) => {
    setErrorObj(null);
    if (brand) {
      setFormData(brand);
      fetchBrandStores(brand.id);
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setFormData(JSON.parse(saved));
      } else {
        setFormData(initialForm);
      }
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorObj(null);

    const isEditing = !!formData.id;
    let res;

    if (isEditing) {
      res = await supabase.from('brands').update({
        name: formData.name,
        country: formData.country,
        primary_color: formData.primary_color,
        logo_url: formData.logo_url
      }).eq('id', formData.id);
    } else {
      res = await supabase.from('brands').insert({
        name: formData.name,
        country: formData.country,
        primary_color: formData.primary_color,
        logo_url: formData.logo_url
      });
    }

    setIsSaving(false);

    if (res.error) {
      setErrorObj(res.error.message);
    } else {
      // Clear draft from localStorage
      localStorage.removeItem(STORAGE_KEY);
      setIsModalOpen(false);
      fetchBrands();
    }
  };

  // Close modal manually and clear any draft
  const handleCloseModal = () => {
    setIsModalOpen(false);
    localStorage.removeItem(STORAGE_KEY);
    setFormData(initialForm);
    setBrandStores([]);
  };

  // Fetch stores for a brand
  const fetchBrandStores = async (brandId) => {
    const { data, error } = await supabase.from('stores').select('*').eq('brand_id', brandId);
    if (!error) setBrandStores(data);
    else console.error('Error fetching stores', error);
  };

  // Open store modal (new or edit)
  const handleOpenStoreModal = (store = null) => {
    if (store) setStoreForm(store);
    else setStoreForm({ id: null, name: '' });
    setIsStoreModalOpen(true);
  };

  // Save store (insert or update)
  const handleStoreSave = async (e) => {
    e.preventDefault();
    const isEditing = !!storeForm.id;
    let res;
    if (isEditing) {
      res = await supabase.from('stores').update({ name: storeForm.name }).eq('id', storeForm.id);
    } else {
      res = await supabase.from('stores').insert({
        name: storeForm.name,
        brand_id: formData.id,
        country: formData.country,
      });
    }
    if (res.error) {
      alert('Error guardando tienda: ' + res.error.message);
    } else {
      fetchBrandStores(formData.id);
      setIsStoreModalOpen(false);
    }
  };

  // Delete store
  const handleStoreDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta tienda?')) return;
    const { error } = await supabase.from('stores').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else fetchBrandStores(formData.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('ATENCIÓN: Borrar una marca afectará a todos sus usuarios y tiendas asociadas. ¿Estás absolutamente seguro?')) return;
    
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else fetchBrands();
  };

  if (authLoading || !isSuperAdmin) return <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>Verificando permisos...</div>;

  return (
    <>
      <div className="animate-fade-in relative">
        <div className="header-action">
          <div>
             <h1 className="text-gradient">Gestión de Marcas y Países</h1>
             <p className="text-muted" style={{ marginTop: '4px' }}>Configuración Multi-inquilino (SaaS)</p>
          </div>
          <button onClick={() => handleOpenModal()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Nueva Marca / Región
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Loader2 size={32} style={{ margin: '0 auto 12px auto', animation: 'spin 1s linear infinite' }} />
              <p>Cargando inquilinos...</p>
            </div>
          ) : brands.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <p>No hay marcas registradas en el sistema.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '16px', fontWeight: 500 }}>Logo</th>
                    <th style={{ padding: '16px', fontWeight: 500 }}>Marca</th>
                    <th style={{ padding: '16px', fontWeight: 500 }}>País</th>
                    <th style={{ padding: '16px', fontWeight: 500 }}>Color Primario</th>
                    <th style={{ padding: '16px', fontWeight: 500 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ background: '#fff', padding: '4px', borderRadius: '4px', display: 'inline-block' }}>
                          <img src={b.logo_url} alt="Logo" style={{ maxHeight: '30px', width: 'auto', display: 'block' }} />
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontWeight: 600, color: 'var(--text-main)' }}>{b.name}</td>
                      <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{b.country}</td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: b.primary_color, border: '1px solid rgba(255,255,255,0.2)' }}></div>
                           <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{b.primary_color}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button onClick={() => handleOpenModal(b)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', opacity: 0.8 }}>
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDelete(b.id)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', opacity: 0.8 }}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Nuevo/Editar ── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 100,
          display: 'grid', placeItems: 'center', padding: '16px'
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-dark)', padding: 0, overflow: 'hidden' }}>

            <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings color="var(--accent-primary)" /> {formData.id ? 'Editar Marca' : 'Nueva Marca / Región'}
              </h2>
              <button onClick={handleCloseModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
                <X />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <form onSubmit={handleSave}>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  <div className="input-group" style={{ flex: 1, margin: 0 }}>
                    <label className="input-label">Nombre de la Empresa</label>
                    <input type="text" className="input-field" value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Nike" required />
                  </div>
                  <div className="input-group" style={{ flex: 1, margin: 0 }}>
                    <label className="input-label">País / Región</label>
                    <input type="text" className="input-field" value={formData.country}
                      onChange={e => setFormData({ ...formData, country: e.target.value })}
                      placeholder="Ej: Ecuador" required />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Color Institucional (Hex)</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input type="color" value={formData.primary_color}
                      onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                      style={{ width: '50px', height: '50px', cursor: 'pointer', padding: 0, border: 'none', borderRadius: '8px', background: 'transparent' }} required />
                    <input type="text" className="input-field" value={formData.primary_color}
                      onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                      placeholder="#004882" style={{ flex: 1, margin: 0 }} required />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">URL del Logo Institucional</label>
                  <input type="url" className="input-field" value={formData.logo_url}
                    onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://..." required />
                  {formData.logo_url && (
                    <div style={{ marginTop: '12px', background: '#fff', padding: '8px', borderRadius: '8px', display: 'inline-block' }}>
                       <img src={formData.logo_url} alt="Preview" style={{ maxHeight: '40px', display: 'block' }} />
                    </div>
                  )}
                </div>

                {errorObj && <p style={{ color: 'var(--accent-danger)', marginBottom: '16px', fontSize: '0.9rem' }}>{errorObj}</p>}

                <div style={{ marginTop: '32px' }}>
                  <button type="submit" className="btn-primary" disabled={isSaving} style={{ width: '100%', justifyContent: 'center' }}>
                    {isSaving ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
                    {isSaving ? ' Guardando...' : ' Guardar Configuración'}
                  </button>
                </div>
              </form>

              {/* Locales de esta Marca */}
              {formData.id && (
                <div style={{ marginTop: '32px', borderTop: '1px solid var(--glass-border)', paddingTop: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', color: 'var(--text-main)' }}>
                      <Store size={18} color="var(--accent-primary)" /> Locales de esta Marca
                    </h3>
                    <button type="button" onClick={() => handleOpenStoreModal()} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                      <Plus size={14} /> Añadir Local
                    </button>
                  </div>

                  {brandStores.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.03)', borderRadius: '12px' }}>
                      No hay locales asociados a esta marca.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                      {brandStores.map(store => (
                        <div key={store.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 14px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--glass-border)', borderRadius: '10px'
                        }}>
                          <span style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)' }}>{store.name}</span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" onClick={() => handleOpenStoreModal(store)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', opacity: 0.8, padding: '4px' }}>
                              <Edit2 size={14} />
                            </button>
                            <button type="button" onClick={() => handleStoreDelete(store.id)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', opacity: 0.8, padding: '4px' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      )}

      {/* ── Modal Tienda / Local ── */}
      {isStoreModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200,
          display: 'grid', placeItems: 'center', padding: '16px'
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-dark)', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                <Store size={18} color="var(--accent-primary)" /> {storeForm.id ? 'Editar Local' : 'Nuevo Local'}
              </h3>
              <button onClick={() => setIsStoreModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
                <X />
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <form onSubmit={handleStoreSave}>
                <div className="input-group">
                  <label className="input-label">Nombre del Local</label>
                  <input type="text" className="input-field" value={storeForm.name}
                    onChange={e => setStoreForm({ ...storeForm, name: e.target.value })}
                    placeholder="Ej: Costanera Center" required autoFocus />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}>
                  <Save size={16} /> Guardar Local
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
