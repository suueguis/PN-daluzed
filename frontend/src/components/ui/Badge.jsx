import { cn } from '../../utils/cn';

const tones = {
  neutral:   'bg-slate-100 text-wine-900',
  info:      'bg-peach-200 text-wine-900',
  success:   'bg-mint-200 text-wine-900',
  warning:   'bg-butter-200 text-wine-900',
  danger:    'bg-cherry-500 text-white',
  rose:      'bg-rose-300 text-wine-900',
};

const stateMap = {
  EN_ESPERA:    { tone: 'warning', label: 'En espera' },
  EN_PROCESO:   { tone: 'info',    label: 'En proceso' },
  COMPLETADO:   { tone: 'success', label: 'Completado' },
  CANCELADO:    { tone: 'danger',  label: 'Cancelado' },
  ACTIVO:       { tone: 'success', label: 'Activo' },
  INACTIVO:     { tone: 'neutral', label: 'Inactivo' },
};

export default function Badge({ tone, state, children, className }) {
  let effectiveTone = tone || 'neutral';
  let label = children;
  if (state && stateMap[state]) {
    effectiveTone = stateMap[state].tone;
    label = label ?? stateMap[state].label;
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tones[effectiveTone],
        className,
      )}
    >
      {label}
    </span>
  );
}
