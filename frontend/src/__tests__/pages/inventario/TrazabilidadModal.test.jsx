import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import TrazabilidadModal from '../../../pages/inventario/TrazabilidadModal';

vi.mock('../../../hooks/inventario/useInventario', () => ({
  useTrazabilidad: vi.fn(),
}));

import { useTrazabilidad } from '../../../hooks/inventario/useInventario';

const LOTE = { id: 1, numero_lote: 'L-001' };

const MOVIMIENTOS = [
  {
    id: 1, tipo: 'RECEPCION',
    bodega_origen: null, bodega_origen_nombre: null,
    bodega_destino: 1, bodega_destino_nombre: 'Bodega Principal',
    cantidad: '20000.00', fecha: '2026-05-01T10:00:00Z', notas: 'OC-2026-001',
  },
  {
    id: 2, tipo: 'TRASLADO',
    bodega_origen: 1, bodega_origen_nombre: 'Bodega Principal',
    bodega_destino: 2, bodega_destino_nombre: 'Bodega PDP',
    cantidad: '5000.00', fecha: '2026-05-02T08:00:00Z', notas: '',
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

describe('TrazabilidadModal', () => {
  beforeEach(() => {
    useTrazabilidad.mockReturnValue({ data: { movimientos: MOVIMIENTOS }, isLoading: false });
  });

  it('no renderiza nada cuando lote es null', () => {
    const { container } = render(<TrazabilidadModal lote={null} onClose={() => {}} />, { wrapper });
    expect(container.firstChild).toBeNull();
  });

  it('muestra el número de lote en el título', () => {
    render(<TrazabilidadModal lote={LOTE} onClose={() => {}} />, { wrapper });
    expect(screen.getByRole('heading', { name: /L-001/i })).toBeInTheDocument();
  });

  it('renderiza una fila por movimiento', () => {
    render(<TrazabilidadModal lote={LOTE} onClose={() => {}} />, { wrapper });
    expect(screen.getByText('Recepción')).toBeInTheDocument();
    expect(screen.getByText('Traslado')).toBeInTheDocument();
  });

  it('muestra el flujo de bodegas correctamente', () => {
    render(<TrazabilidadModal lote={LOTE} onClose={() => {}} />, { wrapper });
    expect(screen.getByText('Bodega Principal')).toBeInTheDocument();
    expect(screen.getByText('Bodega Principal → Bodega PDP')).toBeInTheDocument();
  });

  it('muestra spinner mientras carga', () => {
    useTrazabilidad.mockReturnValue({ data: undefined, isLoading: true });
    render(<TrazabilidadModal lote={LOTE} onClose={() => {}} />, { wrapper });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('muestra empty state cuando no hay movimientos', () => {
    useTrazabilidad.mockReturnValue({ data: { movimientos: [] }, isLoading: false });
    render(<TrazabilidadModal lote={LOTE} onClose={() => {}} />, { wrapper });
    expect(screen.getByText(/Sin movimientos/i)).toBeInTheDocument();
  });

  it('llama onClose al hacer click en Cerrar', async () => {
    const onClose = vi.fn();
    render(<TrazabilidadModal lote={LOTE} onClose={onClose} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Cerrar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
