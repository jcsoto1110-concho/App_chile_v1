import React, { useState, useEffect } from 'react';
import { Search, Plus, MoreHorizontal, Loader2, Save, X, UserPlus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // States para el Modal y Registro de Usuarios
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorObj, setErrorObj] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: '',
    store_id: ''
  });

  async function fetchAll() {
    setLoading(true);

    // Colaboradores
    const { data: usersData } = await supabase
      .from('profiles')
      .select('*, stores(name)')
      .order('created_at', { ascending: false });
    if (usersData) setUsers(usersData);

    // Tiendas
    const { data: storesData } = await supabase.from('stores').select('*');
    if (storesData) setStores(storesData);

    // Roles desde tabla de configuración (dinámica)
    const { data: rolesData } = await supabase
      .from('roles')
      .select('*')
      .order('label', { ascending: true });

    if (rolesData && rolesData.length > 0) {
      setRoles(rolesData);
      // Asignar el primer rol como default del formulario
      setFormData(prev => ({ ...prev, role: prev.role || rolesData[0].name }));
    } else {
      // Fallback si la tabla roles aún no existe en BD
      const fallback = [
        { name: 'asesor', label: 'Asesor de Ventas' },
        { name: 'cajero', label: 'Cajero' },
        { name: 'bodeguero', label: 'Bodeguero' },
      ];
      setRoles(fallback);
      setFormData(prev => ({ ...prev, role: prev.role || 'asesor' }));
    }

    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorObj(null);

    const newUserId = crypto.randomUUID();

    const { error } = await supabase.from('profiles').insert({
       id: newUserId,
       full_name: formData.full_name,
       email: formData.email,
       password: formData.password,
       role: formData.role,
       store_id: formData.store_id || null,
    });

    setIsSaving(false);

    if (!error) {
       setIsModalOpen(false);
       setFormData({ full_name: '', email: '', password: '', role: roles[0]?.name || 'asesor', store_id: '' });
       fetchAll();
    } else {
       setErrorObj(error.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    const ok = window.confirm('¿Seguro que deseas dar de baja a este colaborador? Perderá todos sus FitCoins y progreso.');
    if (!ok) return;
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) alert('Error al eliminar: ' + error.message);
    else fetchAll();
  };

  return (
    <>
      <div className="animate-fade-in relative">
        <div className="header-action">
          <div>
            <h1 className="text-gradient">Usuarios y Asesores</h1>
            <p className="text-muted" style={{ marginTop: '4px' }}>Gestiona los perfiles de la fuerza de venta de las tiendas</p>
          </div>
          <button onClick={() => { setIsModalOpen(true); setErrorObj(null); }} className="btn-primary">
            <Plus size={18} /> Nuevo Usuario
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <div className="input-group" style={{ margin: 0, flex: 1, position: 'relative' }}>
              <Search size={20} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }} />
              <input type="text" className="input-field" placeholder="Buscar por nombre, email o tienda..." style={{ paddingLeft: '48px' }} />
            </div>
            <button className="btn-secondary">Filtrar</button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 12px auto', animation: 'spin 1s linear infinite' }} />
              <p>Cargando lista de personal...</p>
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <p>No hay colaboradores registrados en el sistema.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '16px', fontWeight: 500 }}>Nombre</th>
                    <th style={{ padding: '16px', fontWeight: 500 }}>Rol</th>
                    <th style={{ padding: '16px', fontWeight: 500 }}>Tienda</th>
                    <th style={{ padding: '16px', fontWeight: 500 }}>Nivel</th>
                    <th style={{ padding: '16px', fontWeight: 500 }}>FitCoins</th>
                    <th style={{ padding: '16px', fontWeight: 500 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '16px', fontWeight: 500 }}>
                        <div>{user.full_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{user.email}</div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        {/* Buscar label en tabla de roles o mostrar el valor crudo */}
                        <span className={`badge ${user.role === 'admin' || user.role === 'supervisor' ? 'warning' : 'primary'}`}>
                          {roles.find(r => r.name === user.role)?.label || user.role}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{user.stores?.name || 'Sin Asignar'}</td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          Lv. {user.current_level}
                          <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', flex: 1, borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(user.current_xp % 100)}%`, background: 'var(--accent-primary)' }}></div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px', color: 'var(--accent-warning)', fontWeight: 600 }}>{user.fitcoins} FC</td>
                      <td style={{ padding: '16px' }}>
                        <button onClick={() => handleDeleteUser(user.id)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', opacity: 0.8 }} title="Eliminar Usuario">
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Registro Personal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 100,
          display: 'grid', placeItems: 'center', padding: '16px'
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-dark)', padding: 0, overflow: 'hidden' }}>

            <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus color="var(--accent-primary)" /> Registrar Integrante
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <form onSubmit={handleSaveUser}>

                <div className="input-group">
                  <label className="input-label">Nombre Completo</label>
                  <input type="text" className="input-field" value={formData.full_name}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Ej: Daniela Soto" required autoFocus />
                </div>

                <div className="input-group">
                  <label className="input-label">Correo Electrónico Corporativo</label>
                  <input type="email" className="input-field" value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="daniela.soto@empresa.com" required />
                </div>

                <div className="input-group">
                  <label className="input-label">Clave de Acceso Temporal</label>
                  <input type="text" className="input-field" value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Ej: ventas123" required />
                </div>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">Rol Operativo</label>
                    {/* Dinámico: se llena desde la tabla 'roles' de Supabase */}
                    <select className="input-field" value={formData.role}
                      onChange={e => setFormData({ ...formData, role: e.target.value })}>
                      {roles.map(r => (
                        <option key={r.name} value={r.name}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">Asignación de Tienda</label>
                    <select className="input-field" value={formData.store_id}
                      onChange={e => setFormData({ ...formData, store_id: e.target.value })} required>
                      <option value="" disabled>Selecciona una sede...</option>
                      {stores.map(st => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {errorObj && <p style={{ color: 'var(--accent-danger)', marginBottom: '16px', fontSize: '0.9rem' }}>{errorObj}</p>}

                <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
                  <button type="submit" className="btn-primary" disabled={isSaving} style={{ flex: 1 }}>
                    {isSaving ? <Loader2 className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
                    {isSaving ? ' Afiliando...' : ' Añadir al Sistema'}
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
