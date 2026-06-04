import { cn } from '../../utils/cn';

const roleColors = {
  ADMIN: 'bg-cherry-500 text-white',
  GERENTE: 'bg-peach-300 text-wine-900',
  PRODUCCION: 'bg-butter-200 text-wine-900',
  INVENTARIO: 'bg-mint-200 text-wine-900',
};

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-20 w-20 text-2xl',
};

export function getInitials(value) {
  if (!value || typeof value !== 'string') return '?';

  const local = value.split('@')[0] || value;
  const parts = local
    .split(/[._\-+\s]+/)
    .filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Avatar({ name, role, size = 'md', className }) {
  const initials = getInitials(name);
  const color = roleColors[role] ?? 'bg-cream-100 text-wine-900 border border-peach-300';

  return (
    <div
      data-testid="user-avatar"
      data-role={role ?? 'NONE'}
      aria-label={name ? `Avatar de ${name}` : 'Avatar de usuario'}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold uppercase shadow-sm select-none',
        sizeClasses[size] ?? sizeClasses.md,
        color,
        className,
      )}
    >
      {initials}
    </div>
  );
}
