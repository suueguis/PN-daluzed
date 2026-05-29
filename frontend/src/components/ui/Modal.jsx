import { useEffect } from 'react';
import { cn } from '../../utils/cn';

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-wine-900/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn('w-full rounded-2xl bg-white shadow-xl', sizes[size])}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <header className="border-b border-peach-200 px-5 py-4">
            <h2 className="text-lg font-bold text-wine-900">{title}</h2>
          </header>
        )}
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <footer className="border-t border-peach-200 px-5 py-3 flex justify-end gap-2">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
