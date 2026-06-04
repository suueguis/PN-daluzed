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
