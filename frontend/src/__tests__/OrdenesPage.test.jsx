import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OrdenesPage from '../pages/recepcion/OrdenesPage';

// Mock the API module
vi.mock('../api/recepcionAPI', () => ({
  ordenesAPI: {
    list: vi.fn(),
  },
  recepcionesAPI: { list: vi.fn(), get: vi.fn(), create: vi.fn() },
  catalogoForRecepcion: {
    proveedores:    vi.fn(),
    materiasPrimas: vi.fn(),
    presentaciones: vi.fn(),
  },
}));

const { ordenesAPI } = await import('../api/recepcionAPI');

const ORDENES_MOCK = [
  { id: 1, proveedor: 'Prov. Alpha', fecha_creacion: '2026-05-01', estado: 'PENDIENTE' },
  { id: 2, proveedor: 'Prov. Beta',  fecha_creacion: '2026-05-10', estado: 'RECIBIDA'  },
  { id: 3, proveedor: 'Prov. Gamma', fecha_creacion: '2026-05-15', estado: 'CANCELADA' },
];

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <OrdenesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('OrdenesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra las órdenes al cargar', async () => {
    ordenesAPI.list.mockResolvedValue({ data: ORDENES_MOCK });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('OC-1')).toBeInTheDocument();
      expect(screen.getByText('OC-2')).toBeInTheDocument();
    });

    expect(screen.getByText('Prov. Alpha')).toBeInTheDocument();
    expect(screen.getByText('Prov. Beta')).toBeInTheDocument();
  });

  it('filtra por estado PENDIENTE y refetches', async () => {
    // First render returns all
    ordenesAPI.list.mockResolvedValue({ data: ORDENES_MOCK });
    renderPage();
    await waitFor(() => expect(screen.getByText('OC-1')).toBeInTheDocument());

    // Change filter
    ordenesAPI.list.mockResolvedValue({
      data: ORDENES_MOCK.filter((o) => o.estado === 'PENDIENTE'),
    });

    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, 'PENDIENTE');

    await waitFor(() => {
      expect(ordenesAPI.list).toHaveBeenCalledWith({ estado: 'PENDIENTE' });
    });
  });

  it('filtra por estado RECIBIDA', async () => {
    ordenesAPI.list.mockResolvedValue({ data: ORDENES_MOCK });
    renderPage();
    await waitFor(() => expect(screen.getByText('OC-1')).toBeInTheDocument());

    ordenesAPI.list.mockResolvedValue({
      data: ORDENES_MOCK.filter((o) => o.estado === 'RECIBIDA'),
    });

    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, 'RECIBIDA');

    await waitFor(() => {
      expect(ordenesAPI.list).toHaveBeenCalledWith({ estado: 'RECIBIDA' });
    });
  });

  it('botón "Registrar recepción" está deshabilitado para órdenes no PENDIENTE', async () => {
    ordenesAPI.list.mockResolvedValue({ data: ORDENES_MOCK });
    renderPage();

    await waitFor(() => expect(screen.getByText('OC-2')).toBeInTheDocument());

    const buttons = screen.getAllByRole('button', { name: /registrar recepción/i });
    // idx 0 → OC-1 PENDIENTE (enabled), idx 1 → OC-2 RECIBIDA (disabled)
    expect(buttons[0]).not.toBeDisabled();
    expect(buttons[1]).toBeDisabled();
  });

  it('muestra empty state cuando no hay órdenes', async () => {
    ordenesAPI.list.mockResolvedValue({ data: [] });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/no hay órdenes de compra/i)).toBeInTheDocument();
    });
  });
});
