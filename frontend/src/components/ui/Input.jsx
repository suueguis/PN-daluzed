import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Input = forwardRef(function Input(
  { label, error, className, id, ...rest },
  ref,
) {
  const inputId = id || rest.name;
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-wine-700 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(
          'rounded-xl border border-peach-300 bg-white px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300',
          'placeholder:text-wine-700/40',
          error && 'border-cherry-500 focus:ring-cherry-500',
          className,
        )}
        {...rest}
      />
      {error && (
        <span id={`${inputId}-error`} role="alert" className="text-xs text-cherry-500">
          {error}
        </span>
      )}
    </div>
  );
});

export default Input;
