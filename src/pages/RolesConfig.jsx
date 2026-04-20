import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Settings } from 'lucide-react';
import { getRoles, saveRoles } from '../lib/rolesConfig';

export default function RolesConfig() {
  const [roles, setRoles] = useState([]);
  const [newName, setNewName] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setRoles(getRoles());
  }, []);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newLabel.trim()) return;
    const key = newName.trim().toLowerCase().replace(/\s+/g, '_');
    if (roles.find(r => r.name === key)) return;
    setRoles(prev => [...prev, { name: key, label: newLabel.trim() }]);
    setNewName('');
    setNewLabel('');
  };

  const handleDelete = (name) => {
    setRoles(prev => prev.filter(r => r.name !== name));
  };

  const handleSave = () => {
    saveRoles(roles);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="animate-fade-in">
      <div className="header-action">
        <div>
          <h1 className="text-gradient">Configuración de Roles</h1>
          <p className="text-muted" style={{ marginTop: '4px' }}>
            Administra los roles operativos disponibles en el sistema
          </p>
        </div>
        <button onClick={handleSave} className="btn-primary">
          <Save size={18} /> {saved ? '¡Guardado!' : 'Guardar Cambios'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* Lista de Roles Actuales */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ marginBottom: '24px', fontSize: '1.1rem' }}>Roles Activos</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {roles.map(role => (
              <div key={role.name} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px'
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{role.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    código: <code style={{ color: 'var(--accent-primary)' }}>{role.name}</code>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(role.name)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', opacity: 0.7 }}
                  title="Eliminar rol"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {roles.length === 0 && (
              <p className="text-muted" style={{ textAlign: 'center', padding: '24px' }}>
                No hay roles configurados.
              </p>
            )}
          </div>
        </div>

        {/* Agregar Nuevo Rol */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ marginBottom: '24px', fontSize: '1.1rem' }}>Agregar Nuevo Rol</h2>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Nombre de Visualización</label>
              <input
                type="text"
                className="input-field"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Ej: Terceros a Bordo"
                required
              />
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Código Interno (sin espacios)</label>
              <input
                type="text"
                className="input-field"
                value={newName}
                onChange={e => setNewName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                placeholder="Ej: tercero_bordo"
                required
              />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <Plus size={18} /> Agregar Rol
            </button>
          </form>

          <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(0,240,255,0.05)', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--accent-primary)' }}>💡 Tip:</strong> Los roles se guardan localmente.
            Después de editar, haz clic en <strong>"Guardar Cambios"</strong> y el combo de "Nuevo Usuario" se actualizará automáticamente.
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
