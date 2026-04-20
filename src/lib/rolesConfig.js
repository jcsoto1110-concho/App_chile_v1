// Roles predeterminados del sistema
// Se almacenan en localStorage para persistencia entre sesiones
const DEFAULT_ROLES = [
  { name: 'asesor', label: 'Asesor de Ventas' },
  { name: 'cajero', label: 'Cajero' },
  { name: 'bodeguero', label: 'Bodeguero' },
  { name: 'supervisor', label: 'Supervisor' },
  { name: 'tercero', label: 'Terceros a Bordo' },
];

const STORAGE_KEY = 'app_roles_config';

export function getRoles() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_ROLES;
}

export function saveRoles(roles) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
}
