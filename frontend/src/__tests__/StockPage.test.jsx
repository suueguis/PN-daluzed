import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import StockPage from '../pages/inventario/StockPage';

vi.mock('../hooks/inventario/useInventario', () => ({
  useLotes: vi.fn(),
  useBodegas: vi.fn(),
}));
vi.mock('../hooks/useApi', () => ({
  useApiQuery: vi.fn(),
}));

import { useLotes, useBodegas } from '../hooks/inventario/useInventario';
import { useApiQuery } from '../hooks/useApi';

const BODEGAS = [
  { id: 1, nombre: 'Bodega Principal', tipo: 'PRINCIPAL' },
  { id: 2, nombre: 'Bodega PDP', tipo: 'PDP' },
];

const MPS = [
  { id: 10, nombre: 'Harina de trigo', punto_reorden: 10000 },
  { id: 11, nombre: 'Azúcar', punto_reorden: 5000 },
];

const LOTES = [
  { id: 1, materia_prima: 10, bodega: 1, cantidad: '8000', fecha_vencimiento: '2026-12-01' },
  { id: 2, materia_prima: 10, bodega: 2, cantidad: '2000', fecha_vencimiento: '2026-11-01' },
  { id: 3, materia_prima: 11, bodega: 1, cantidad: '6000', fecha_vencimiento: '2026-10-01' },
];

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('StockPage', () => {
  beforeEach(() => {
    useLotes.mockReturnValue({ data: LOTES, isLoading: false });
    useBodegas.mockReturnValue({ data: BODEGAS, isLoading: false });
    useApiQuery.mockReturnValue({ data: MPS, isLoading: false });
  });

  it('muestra las materias primas en la tabla pivot', () => {
    render(<StockPage />, { wrapper });
    expect(screen.getByText('Harina de trigo')).toBeInTheDocument();
    expect(screen.getByText('Azúcar')).toBeInTheDocument();
  });

  it('marca la fila en rojo cuando está bajo punto de reorden', () => {
    render(<StockPage />, { wrapper });
    // Harina: BP=8000 < reorden=10000 → debe marcar rojo
    const indicadores = screen.getAllByLabelText('bajo-reorden');
    expect(indicadores.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Reorden:/i).length).toBeGreaterThan(0);
  });

  it('no marca como bajo reorden si el stock supera el punto', () => {
    render(<StockPage />, { wrapper });
    // Azúcar: BP=6000 > reorden=5000 → no debe marcar
    const textos = screen.queryAllByText(/Reorden:/i);
    // Solo debe haber 1 (Harina), no 2
    expect(textos).toHaveLength(1);
  });

  it('muestra spinner mientras carga', () => {
    useLotes.mockReturnValue({ data: [], isLoading: true });
    render(<StockPage />, { wrapper });
    expect(document.querySelector('[role="status"]') || document.querySelector('svg')).toBeTruthy();
  });
});
