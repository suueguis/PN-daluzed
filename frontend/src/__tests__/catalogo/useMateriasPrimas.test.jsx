import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import axiosClient from '../../api/axiosClient';
import {
  useMateriasPrimasQuery,
  useCreateMP,
} from '../../hooks/catalogo/useCatalogo';

let mock;
let qc;

beforeEach(() => {
  mock = new MockAdapter(axiosClient);
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  mock.restore();
});

function wrapper({ children }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useMateriasPrimasQuery', () => {
  it('devuelve datos del API tras el fetch', async () => {
    mock.onGet('/catalogo/materias-primas/').reply(200, {
      results: [{ id: 1, nombre: 'Azúcar', activo: true }],
    });

    const { result } = renderHook(() => useMateriasPrimasQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.results).toHaveLength(1);
    expect(result.current.data.results[0].nombre).toBe('Azúcar');
  });
});

describe('useCreateMP', () => {
  it('invoca POST al API y resuelve con la fila creada', async () => {
    mock.onPost('/catalogo/materias-primas/').reply(201, { id: 99, nombre: 'Cacao' });

    const { result } = renderHook(() => useCreateMP(), { wrapper });
    const created = await result.current.mutateAsync({ nombre: 'Cacao' });

    expect(created).toEqual({ id: 99, nombre: 'Cacao' });
  });
});
