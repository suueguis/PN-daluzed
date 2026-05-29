import { cn } from '../../utils/cn';

const variants = {
  primary: 'bg-rose-500 hover:bg-wine-700 text-white shadow-sm',
  secondary: 'bg-cream-100 hover:bg-peach-200 text-wine-900 border border-peach-300',
  ghost: 'bg-transparent hover:bg-cream-100 text-wine-900',
  danger: 'bg-cherry-500 hover:bg-wine-900 text-white shadow-sm',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-5 py-2.5 text-base rounded-xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  children,
  disabled,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
