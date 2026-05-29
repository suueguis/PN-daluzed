import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export function Toolbar({
  searchValue,
  onSearchChange,
  onNew,
  newLabel = 'Nuevo',
  extras = null,
  searchPlaceholder = 'Buscar…',
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-64">
          <Input
            name="search"
            label="Buscar"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {extras}
      </div>
      {onNew && (
        <Button onClick={onNew} variant="primary">
          + {newLabel}
        </Button>
      )}
    </div>
  );
}

export function ActionsCell({
  onEdit,
  onDelete,
  editLabel = 'Editar',
  deleteLabel = 'Desactivar',
}) {
  return (
    <div className="flex gap-2">
      {onEdit && (
        <Button size="sm" variant="secondary" onClick={onEdit}>
          {editLabel}
        </Button>
      )}
      {onDelete && (
        <Button size="sm" variant="danger" onClick={onDelete}>
          {deleteLabel}
        </Button>
      )}
    </div>
  );
}

export function YesNo({ value }) {
  return (
    <span
      className={
        value
          ? 'inline-block rounded-full bg-cream-100 px-2 py-0.5 text-xs font-semibold text-wine-700'
          : 'inline-block rounded-full bg-peach-200 px-2 py-0.5 text-xs font-semibold text-cherry-500'
      }
    >
      {value ? 'Activo' : 'Inactivo'}
    </span>
  );
}
