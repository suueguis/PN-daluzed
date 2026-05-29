import { cn } from '../../utils/cn';

export default function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-peach-300 border-t-rose-500',
        sizes[size],
        className,
      )}
    />
  );
}
