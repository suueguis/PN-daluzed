import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Select = forwardRef(function Select(
  { label, error, options = [], placeholder, className, id, ...rest },
  ref,
) {
  const selectId = id || rest.name;
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-wine-700 uppercase tracking-wide">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={cn(
          'rounded-xl border border-peach-300 bg-white px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300',
          error && 'border-cherry-500',
          className,
        )}
        {...rest}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <span className="text-xs text-cherry-500">{error}</span>}
    </div>
  );
});

export default Select;
