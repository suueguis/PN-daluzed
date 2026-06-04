import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import BodegasPage from '../../../pages/inventario/BodegasPage';

vi.mock('../../../hooks/inventario/useInventario', () => ({
  useBodegas: vi.fn(),
  useCreateBodega: vi.fn(),
  useUpdateBodega: vi.fn(),
  useDeleteBodega: vi.fn(),
}));

vi.mock('../../../hooks/inventario/useZonas', () => ({
  useZonas: vi.fn(),
  useCreateZona: vi.fn(),
  useUpdateZona: vi.fn(),
  useDeleteZona: vi.fn(),
}));

import {
  useBodegas,
  useCreateBodega,
  useUpdateBodega,
  useDeleteBodega,
} from '../../../hooks/inventario/useInventario';
import {
  useZonas,
  useCreateZona,
  useUpdateZona,
  useDeleteZona,
} from '../../../hooks/inventario/useZonas';

const BODEGAS = [
  {
    id: 1,
    nombre: 'Bodega Principal',
    tipo: 'PRINCIPAL',
    zonas: [{ id: 10 }, { id: 11 }],
  },
  {
    id: 2,
    nombre: 'Bodega PDP',
    tipo: 'PDP',
    zonas: [{ id: 20 }],
  },
];

const ZONAS_BODEGA_1 = [
  { id: 10, nombre: 'Estante A', descripcion: 'Refrigerado' },
  { id: 11, nombre: 'Estante B', descripcion: '' },
];

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function idleMutation() {
  return { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
}

describe('BodegasPage', () => {
  beforeEach(() => {
    useBodegas.mockReturnValue({ data: BODEGAS, isLoading: false });
    useCreateBodega.mockReturnValue(idleMutation());
    useUpdateBodega.mockReturnValue(idleMutation());
    useDeleteBodega.mockReturnValue(idleMutation());

    useZonas.mockReturnValue({ data: ZONAS_BODEGA_1, isLoading: false });
    useCreateZona.mockReturnValue(idleMutation());
    useUpdateZona.mockReturnValue(idleMutation());
    useDeleteZona.mockReturnValue(idleMutation());
  });

  it('renderiza la lista de bodegas', () => {
    render(<BodegasPage />, { wrapper });
    expect(screen.getByText('Bodega Principal')).toBeInTheDocument();
    expect(screen.getByText('Bodega PDP')).toBeInTheDocument();
  });

  it('muestra el botón "Zonas (N)" con el conteo por cada bodega', () => {
    render(<BodegasPage />, { wrapper });
    expect(screen.getByRole('button', { name: /Zonas \(2\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Zonas \(1\)/ })).toBeInTheDocument();
  });

  it('expande el panel de zonas al hacer click en "Zonas"', async () => {
    const user = userEvent.setup();
    render(<BodegasPage />, { wrapper });

    expect(screen.queryByText('Estante A')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Zonas \(2\)/ }));

    expect(screen.getByText('Estante A')).toBeInTheDocument();
    expect(screen.getByText('Estante B')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ocultar zonas/ })).toBeInTheDocument();
  });

  it('colapsa el panel al hacer click de nuevo', async () => {
    const user = userEvent.setup();
    render(<BodegasPage />, { wrapper });

    await user.click(screen.getByRole('button', { name: /Zonas \(2\)/ }));
    expect(screen.getByText('Estante A')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Ocultar zonas/ }));
    expect(screen.queryByText('Estante A')).not.toBeInTheDocument();
  });

  it('abre el modal de zona al hacer click en "+ Agregar zona"', async () => {
    const user = userEvent.setup();
    render(<BodegasPage />, { wrapper });

    await user.click(screen.getByRole('button', { name: /Zonas \(2\)/ }));
    await user.click(screen.getByRole('button', { name: /Agregar zona/ }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Nueva zona — Bodega Principal/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Crear zona/ })).toBeInTheDocument();
  });

  it('abre el modal de bodega al hacer click en "+ Nueva Bodega"', async () => {
    const user = userEvent.setup();
    render(<BodegasPage />, { wrapper });

    await user.click(screen.getByRole('button', { name: /Nueva Bodega/ }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Nueva Bodega' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /^Crear$/ })).toBeInTheDocument();
  });
});
