import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Mock del API client antes de importar la página.
vi.mock('../api/alertasAPI', () => ({
  default: {
    reorden: vi.fn(),
    activas: vi.fn(),
    vencimiento: vi.fn(),
    produccion: vi.fn(),
    resolver: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error:   vi.fn(),
  }),
}));

import alertasAPI from '../../../api/alertasAPI';
import AlertasReordenPage from '../../../pages/alertas/AlertasReordenPage';

function renderWithProviders(ui) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AlertasReordenPage', () => {
  it('lista alertas STOCK_BAJO con el badge cherry-500', async () => {
    alertasAPI.reorden.mockResolvedValueOnce([
      {
        id: 1,
        tipo: 'STOCK_BAJO',
        materia_prima: 7,
        bodega: 1,
        mensaje: 'Stock de Harina por debajo del reorden',
        fecha_creacion: '2026-05-29T10:00:00Z',
      },
    ]);

    renderWithProviders(<AlertasReordenPage />);

    const badge = await screen.findByText('Stock bajo');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-cherry-500/);
    expect(
      await screen.findByText(/Stock de Harina por debajo del reorden/i),
    ).toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay alertas', async () => {
    alertasAPI.reorden.mockResolvedValueOnce([]);

    renderWithProviders(<AlertasReordenPage />);

    await waitFor(() => {
      expect(screen.getByText(/Sin alertas/i)).toBeInTheDocument();
    });
  });
});
