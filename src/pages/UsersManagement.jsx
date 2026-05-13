import React, { useState, useEffect } from 'react';
import { Search, Plus, Loader2, Save, X, UserPlus, Trash2, Settings, ChevronDown, ChevronUp, Download, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getRoles, saveRoles } from '../lib/rolesConfig';
import * as XLSX from 'xlsx';

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Nuevo Usuario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorObj, setErrorObj] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '', email: '', password: '', role: '', store_id: ''
  });

  // Panel Config Roles (inline)
  const [showRolesConfig, setShowRolesConfig] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleLabel, setNewRoleLabel] = useState('');
  const [rolesSaved, setRolesSaved] = useState(false);

  async function fetchAll() {
    setLoading(true);
    const { data: usersData } = await supabase
      .from('profiles').select('*, stores(name)').order('created_at', { ascending: false });
    if (usersData) setUsers(usersData);

    const { data: storesData } = await supabase.from('stores').select('*');
    if (storesData) setStores(storesData);

    const configRoles = getRoles();
    setRoles(configRoles);
    setFormData(prev => ({ ...prev, role: prev.role || configRoles[0]?.name || 'asesor' }));
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorObj(null);
    const newUserId = crypto.randomUUID();
    const { error } = await supabase.from('profiles').insert({
      id: newUserId, full_name: formData.full_name, email: formData.email,
      password: formData.password, role: formData.role, store_id: formData.store_id || null,
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
    if (!window.confirm('¿Dar de baja a este colaborador? Perderá todo su progreso.')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) alert('Error: ' + error.message);
    else fetchAll();
  };

  // Gestión de Roles inline
  const handleAddRole = (e) => {
    e.preventDefault();
    if (!newRoleName.trim() || !newRoleLabel.trim()) return;
    const key = newRoleName.trim().toLowerCase().replace(/\s+/g, '_');
    if (roles.find(r => r.name === key)) return;
    const updated = [...roles, { name: key, label: newRoleLabel.trim() }];
    setRoles(updated);
    saveRoles(updated);
    setNewRoleName('');
    setNewRoleLabel('');
    setRolesSaved(true);
    setTimeout(() => setRolesSaved(false), 2000);
  };

  const handleDeleteRole = (name) => {
    const updated = roles.filter(r => r.name !== name);
    setRoles(updated);
    saveRoles(updated);
  };

  const exportToExcel = () => {
    const exportData = users.map(user => ({
      'Nombre Completo': user.full_name,
      'Email': user.email,
      'Rol': roles.find(r => r.name === user.role)?.label || user.role,
      'Tienda': user.stores?.name || 'Sin Asignar',
      'Nivel': user.current_level,
      'XP': user.current_xp,
      'FitCoins': user.fitcoins,
      'Racha (Días)': user.streak_days,
      'Fecha Registro': new Date(user.created_at).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
    XLSX.writeFile(wb, `Usuarios_Coach_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        const wb = XLSX.read(data, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);

        const processedUsers = rawData.map(row => {
          const name = row['Nombre Completo'] || row['Nombre'] || row['Full Name'];
          const email = row['Email'] || row['Correo'] || row['email'];
          const roleLabel = row['Rol'] || row['Role'];
          const storeName = row['Tienda'] || row['Store'] || row['Sede'];
          const password = row['Password'] || row['Clave'] || 'marathon2026';

          const foundRole = roles.find(r => r.label.toLowerCase() === String(roleLabel || '').toLowerCase());
          const role = foundRole ? foundRole.name : (roleLabel || 'asesor').toLowerCase();

          const foundStore = stores.find(s => s.name.toLowerCase() === String(storeName || '').toLowerCase());
          const store_id = foundStore ? foundStore.id : null;

          return {
            id: crypto.randomUUID(),
            full_name: name,
            email: email,
            password: password,
            role: role,
            store_id: store_id,
            current_level: 1,
            current_xp: 0,
            fitcoins: 0,
            streak_days: 0
          };
        }).filter(u => u.full_name && u.email);

        if (processedUsers.length === 0) {
          alert('No se encontraron datos válidos en el Excel. Asegúrate de tener columnas como "Nombre Completo" y "Email".');
          setIsSaving(false);
          return;
        }

        const { error } = await supabase.from('profiles').insert(processedUsers);
        if (error) throw error;

        alert(`¡Éxito! Se cargaron ${processedUsers.length} colaboradores.`);
        fetchAll();
      } catch (err) {
        console.error(err);
        alert('Error al procesar el archivo: ' + err.message);
      } finally {
        setIsSaving(false);
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <>
      <div className="animate-fade-in relative">
        <div className="header-action">
          <div>
            <h1 className="text-gradient">Usuarios y Asesores</h1>
            <p className="text-muted" style={{ marginTop: '4px' }}>Gestiona los perfiles de la fuerza de venta</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowRolesConfig(v => !v)}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Settings size={18} />
              Config. Roles
              {showRolesConfig ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button onClick={exportToExcel} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={18} /> Descargar
            </button>
            <label className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <Upload size={18} /> Carga Masiva
              <input type="file" accept=".xlsx, .xls" onChange={handleBulkUpload} style={{ display: 'none' }} />
            </label>
            <button onClick={() => { setIsModalOpen(true); setErrorObj(null); }} className="btn-primary">
              <Plus size={18} /> Nuevo Usuario
            </button>
          </div>
        </div>

        {/* ── Panel de Configuración de Roles (colapsable) ── */}
        {showRolesConfig && (
          <div className="glass-panel animate-fade-in" style={{ padding: '24px', marginBottom: '24px', border: '1px solid rgba(0,240,255,0.15)' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} /> Roles Operativos del Sistema
              {rolesSaved && <span style={{ fontSize: '0.8rem', color: '#00ff88', marginLeft: '8px' }}>✓ Guardado</span>}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

              {/* Lista de roles actuales */}
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>Roles activos:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {roles.map(role => (
                    <div key={role.name} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px'
                    }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{role.label}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginLeft: '8px' }}>
                          ({role.name})
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteRole(role.name)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', opacity: 0.7, padding: '4px' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agregar nuevo rol */}
              <div>
                <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>Agregar nuevo rol:</p>
                <form onSubmit={handleAddRole} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="text"
                    className="input-field"
                    value={newRoleLabel}
                    onChange={e => setNewRoleLabel(e.target.value)}
                    placeholder="Nombre visible (Ej: Supervisor)"
                    style={{ margin: 0 }}
                    required
                  />
                  <input
                    type="text"
                    className="input-field"
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="Código interno (Ej: supervisor)"
                    style={{ margin: 0 }}
                    required
                  />
                  <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
                    <Plus size={16} /> Agregar Rol
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ── Tabla de Usuarios ── */}
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
              <Loader2 size={32} style={{ margin: '0 auto 12px auto', animation: 'spin 1s linear infinite' }} />
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
                        <button onClick={() => handleDeleteUser(user.id)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', opacity: 0.8 }}>
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

      {/* ── Modal Nuevo Usuario ── */}
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

                <div style={{ marginTop: '32px' }}>
                  <button type="submit" className="btn-primary" disabled={isSaving} style={{ width: '100%', justifyContent: 'center' }}>
                    {isSaving ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
                    {isSaving ? ' Afiliando...' : ' Añadir al Sistema'}
                  </button>
                </div>
              </form>
            </div>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } } select option { background: var(--bg-dark); color: #fff; }`}</style>
          </div>
        </div>
      )}
    </>
  );
}
