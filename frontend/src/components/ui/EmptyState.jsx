export default function EmptyState({ title = 'Sin resultados', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-peach-300 bg-cream-100/50 px-6 py-12 text-center">
      <h3 className="text-base font-bold text-wine-900">{title}</h3>
      {description && <p className="max-w-md text-sm text-wine-700">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
