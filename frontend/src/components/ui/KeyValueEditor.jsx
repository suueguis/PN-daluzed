import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import Input from './Input';
import Button from './Button';

function coerce(raw) {
  const trimmed = raw.trim();
  if (trimmed === '') return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return raw;
}

export default function KeyValueEditor({ value, onChange, label, helper }) {
  const [rows, setRows] = useState([{ k: '', v: '' }]);

  const emit = (next) => {
    setRows(next);
    const obj = {};
    for (const { k, v } of next) {
      const key = k.trim();
      if (!key) continue;
      obj[key] = coerce(v);
    }
    onChange?.(obj);
  };

  const setRow = (idx, patch) => {
    emit(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const addRow = () => emit([...rows, { k: '', v: '' }]);
  const removeRow = (idx) => emit(rows.filter((_, i) => i !== idx));

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-xs font-semibold text-wine-700 uppercase tracking-wide">
          {label}
        </span>
      )}
      {helper && <span className="text-xs text-wine-600">{helper}</span>}

      <div className="flex flex-col gap-2">
        {rows.map((row, idx) => (
          <div key={idx} className="flex gap-2 items-end" data-testid="kv-row">
            <div className="flex-1">
              <Input
                aria-label={`Campo ${idx + 1} — nombre`}
                placeholder="ej. cantidad"
                value={row.k}
                onChange={(e) => setRow(idx, { k: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <Input
                aria-label={`Campo ${idx + 1} — valor`}
                placeholder="ej. 250"
                value={row.v}
                onChange={(e) => setRow(idx, { v: e.target.value })}
              />
            </div>
            {rows.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Eliminar campo ${idx + 1}`}
                onClick={() => removeRow(idx)}
                className="mb-0.5"
              >
                <X size={14} />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button type="button" variant="secondary" size="sm" onClick={addRow} className="self-start">
        <Plus size={14} /> Añadir campo
      </Button>

      {value !== undefined && value !== null && Object.keys(value).length > 0 && (
        <code
          data-testid="kv-preview"
          className="block text-xs text-wine-700 bg-peach-50 rounded px-2 py-1"
        >
          {JSON.stringify(value)}
        </code>
      )}
    </div>
  );
}
