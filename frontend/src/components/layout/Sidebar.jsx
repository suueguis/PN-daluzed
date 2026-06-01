import { NavLink } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { menuItems, canAccess } from '../../config/routes';
import { cn } from '../../utils/cn';

export default function Sidebar({ open, onClose }) {
  const { user } = useAuthStore();
  const role = user?.role;

  return (
    <aside
      className={cn(
        'fixed left-0 top-[60px] bottom-0 z-40 w-[220px] shrink-0 border-r border-peach-200 bg-cream-100 px-3 py-6 transition-transform duration-200',
        'lg:static lg:top-auto lg:bottom-auto lg:z-auto lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <nav aria-label="Navegación principal" className="flex flex-col gap-1">
        {menuItems.filter((item) => canAccess(item, role)).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-wine-900 hover:bg-peach-200',
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
