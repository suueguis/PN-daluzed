import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import LotesPage from '../pages/inventario/LotesPage';

vi.mock('../hooks/inventario/useInventario', () => ({
  useLotes: vi.fn(),
  useBodegas: vi.fn(),
  useCreateDevolucion: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCreateDescarte: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));
vi.mock('../hooks/useApi', () => ({
  useApiQuery: vi.fn(),
}));

import { useLotes, useBodegas } from '../hooks/inventario/useInventario';
import { useApiQuery } from '../hooks/useApi';

const VENCE_7 = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
const VENCIDO = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];

const LOTES = [
  {
    id: 1, numero_lote: 'L-001',
    materia_prima: 10, materia_prima_nombre: 'Harina',
    bodega: 1, bodega_nombre: 'Bodega Principal', bodega_tipo: 'PRINCIPAL',
    cantidad: '5000', fecha_vencimiento: VENCE_7,
  },
  {
    id: 2, numero_lote: 'L-002',
    materia_prima: 11, materia_prima_nombre: 'Azúcar',
    bodega: 2, bodega_nombre: 'Bodega PDP', bodega_tipo: 'PDP',
    cantidad: '2000', fecha_vencimiento: VENCIDO,
  },
];

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('LotesPage', () => {
  beforeEach(() => {
    useLotes.mockReturnValue({ data: LOTES, isLoading: false });
    useBodegas.mockReturnValue({ data: [{ id: 1, nombre: 'Bodega Principal' }, { id: 2, nombre: 'Bodega PDP' }], isLoading: false });
    useApiQuery.mockReturnValue({ data: [{ id: 10, nombre: 'Harina' }, { id: 11, nombre: 'Azúcar' }], isLoading: false });
  });

  it('muestra todos los lotes por defecto', () => {
    render(<LotesPage />, { wrapper });
    // nombres aparecen tanto en el select-filtro como en las celdas
    expect(screen.getAllByText('Harina').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Azúcar').length).toBeGreaterThan(0);
  });

  it('muestra badge danger (vencido) para lote vencido', () => {
    render(<LotesPage />, { wrapper });
    expect(screen.getByText(/Vencido hace/i)).toBeInTheDocument();
  });

  it('muestra badge warning para lote próximo a vencer (≤7 días)', () => {
    render(<LotesPage />, { wrapper });
    expect(screen.getByText(/d restantes/i)).toBeInTheDocument();
  });

  it('muestra botones Devolver y Descartar en cada fila', () => {
    render(<LotesPage />, { wrapper });
    expect(screen.getAllByRole('button', { name: /Devolver/i })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /Descartar/i })).toHaveLength(2);
  });

  it('abre modal devolución al hacer click en Devolver', async () => {
    render(<LotesPage />, { wrapper });
    await userEvent.click(screen.getAllByRole('button', { name: /Devolver/i })[0]);
    // El título del modal es único en el documento
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Registrar Devolución/i })).toBeInTheDocument();
  });
});
