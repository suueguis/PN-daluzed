import { useMemo, useState } from 'react';
import { useDebounce } from '../../hooks/useDebounce';

export function useFilteredList(items, query, keys) {
  return useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((it) =>
      keys.some((k) => String(it[k] ?? '').toLowerCase().includes(q)),
    );
  }, [items, query, keys]);
}

export function useSearch(delay = 300) {
  const [input, setInput] = useState('');
  const debounced = useDebounce(input, delay);
  return { input, setInput, debounced };
}

export function extractRows(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}
