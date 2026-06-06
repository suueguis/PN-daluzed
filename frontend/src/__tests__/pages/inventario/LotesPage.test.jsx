import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import LotesPage from '../../../pages/inventario/LotesPage';

vi.mock('../../../hooks/inventario/useInventario', () => ({
  useLotes: vi.fn(),
  useBodegas: vi.fn(),
  useCreateDevolucion: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCreateDescarte: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useTrazabilidad: vi.fn(() => ({
    data: {
      movimientos: [
        {
          id: 1, tipo: 'RECEPCION', fecha: '2026-01-10T08:00:00Z',
          bodega_origen_nombre: null, bodega_destino_nombre: 'Bodega Principal',
          cantidad: '5000', notas: '',
        },
      ],
    },
    isLoading: false,
  })),
}));
vi.mock('../../../hooks/useApi', () => ({
  useApiQuery: vi.fn(),
}));

import { useLotes, useBodegas } from '../../../hooks/inventario/useInventario';
import { useApiQuery } from '../../../hooks/useApi';

const VENCE_7 = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
const VENCIDO = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];

const LOTES = [
  {
    id: 1, numero_lote: 'L-001',
    materia_prima: 10, materia_prima_nombre: 'Harina',
    bodega: 1, bodega_nombre: 'Bodega Principal', bodega_tipo: 'PRINCIPAL',
    cantidad: '5000', fecha_vencimiento: VENCE_7,
    fecha_entrada: '2026-01-01', proveedor_nombre: 'Proveedor A',
  },
  {
    id: 2, numero_lote: 'L-002',
    materia_prima: 11, materia_prima_nombre: 'Azúcar',
    bodega: 2, bodega_nombre: 'Bodega PDP', bodega_tipo: 'PDP',
    cantidad: '2000', fecha_vencimiento: VENCIDO,
    fecha_entrada: null, proveedor_nombre: null,
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
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Registrar Devolución/i })).toBeInTheDocument();
  });

  it('muestra botón Ver detalle en cada fila con aria-expanded=false', () => {
    render(<LotesPage />, { wrapper });
    const toggles = screen.getAllByRole('button', { name: /Ver detalle|Expandir detalle/i });
    expect(toggles).toHaveLength(2);
    toggles.forEach((btn) => expect(btn).toHaveAttribute('aria-expanded', 'false'));
  });

  it('expande la fila al hacer click en Ver detalle y muestra metadata del lote', async () => {
    render(<LotesPage />, { wrapper });
    const [firstToggle] = screen.getAllByRole('button', { name: /Ver detalle|Expandir detalle/i });
    await userEvent.click(firstToggle);
    expect(firstToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Proveedor A')).toBeInTheDocument();
    expect(screen.getByText('Historial de movimientos')).toBeInTheDocument();
  });

  it('contrae la fila al hacer click en Cerrar', async () => {
    render(<LotesPage />, { wrapper });
    const [firstToggle] = screen.getAllByRole('button', { name: /Ver detalle|Expandir detalle/i });
    await userEvent.click(firstToggle);
    expect(firstToggle).toHaveAttribute('aria-expanded', 'true');
    const cerrarBtn = screen.getByRole('button', { name: /Cerrar|Contraer/i });
    await userEvent.click(cerrarBtn);
    expect(firstToggle).toHaveAttribute('aria-expanded', 'false');
  });
});
