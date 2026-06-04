import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NuevaOrdenPage from '../pages/recepcion/NuevaOrdenPage';

vi.mock('../api/recepcionAPI', () => ({
  ordenesAPI: { create: vi.fn() },
  catalogoForRecepcion: {
    proveedores:    vi.fn(),
    materiasPrimas: vi.fn(),
    presentaciones: vi.fn(),
  },
}));

const { catalogoForRecepcion } = await import('../api/recepcionAPI');

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NuevaOrdenPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('NuevaOrdenPage — selector de proveedores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalogoForRecepcion.materiasPrimas.mockResolvedValue({ data: [] });
    catalogoForRecepcion.presentaciones.mockResolvedValue({ data: [] });
  });

  it('pide proveedores con ?activo=true', async () => {
    catalogoForRecepcion.proveedores.mockResolvedValue({ data: [] });
    renderPage();
    await waitFor(() => {
      expect(catalogoForRecepcion.proveedores).toHaveBeenCalledWith({ activo: true });
    });
  });

  it('no lista proveedores inactivos en el dropdown', async () => {
    catalogoForRecepcion.proveedores.mockResolvedValue({
      data: [
        { id: 1, nombre: 'Proveedor Activo',   activo: true },
        { id: 2, nombre: 'Proveedor Inactivo', activo: false },
      ],
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Proveedor Activo' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('option', { name: 'Proveedor Inactivo' })).not.toBeInTheDocument();
  });
});
