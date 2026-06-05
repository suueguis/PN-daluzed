export const ROLES = {
  ADMIN: 'ADMIN',
  GERENTE: 'GERENTE',
  PRODUCCION: 'PRODUCCION',
  INVENTARIO: 'INVENTARIO',
};

export const menuItems = [
  { path: '/dashboard',      label: 'Inicio',    roles: ['*'] },
  { path: '/catalogo',       label: 'Catálogo',  roles: ['ADMIN', 'GERENTE', 'INVENTARIO'] },
  { path: '/inventario',     label: 'Inventario',roles: ['ADMIN', 'GERENTE', 'INVENTARIO'] },
  { path: '/recepcion',      label: 'Recepción', roles: ['ADMIN', 'INVENTARIO'] },
  { path: '/produccion',     label: 'Producción',roles: ['ADMIN', 'PRODUCCION'] },
  { path: '/alertas',        label: 'Alertas',     roles: ['*'] },
  { path: '/indicadores',    label: 'Indicadores', roles: ['ADMIN', 'GERENTE'] },
  { path: '/admin/usuarios', label: 'Usuarios',    roles: ['ADMIN'] },
  { path: '/admin/bitacora', label: 'Bitácora',    roles: ['ADMIN'] },
];

export function canAccess(item, userRole) {
  if (!userRole) return false;
  if (item.roles.includes('*')) return true;
  return item.roles.includes(userRole);
}
