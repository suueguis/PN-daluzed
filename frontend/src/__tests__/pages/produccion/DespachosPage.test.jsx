import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DespachosPage from '../../../pages/produccion/DespachosPage';

// ── Mocks ──────────────────────────────────────────────────────────────
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...a) => toastSuccess(...a),
    error: (...a) => toastError(...a),
  },
}));

const mockDespacharLote = vi.fn();
vi.mock('../../../api/produccionAPI', () => ({
  produccionAPI: {
    despacharLote: (...a) => mockDespacharLote(...a),
  },
}));

vi.mock('../../../hooks/useApi', () => ({
  useApiQuery: vi.fn(),
}));

import { useApiQuery } from '../../../hooks/useApi';

// ── Helpers ────────────────────────────────────────────────────────────
const LOTES_EN_ESPERA = [
  {
    id: 1,
    batido: 10,
    estado: 'EN_ESPERA',
    cantidad: '5.00',
    fecha_produccion: '2026-05-28',
    fecha_vencimiento: '2026-06-28',
    fecha_despacho: null,
  },
];

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQC()}>
      <MemoryRouter>
        <DespachosPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────
describe('DespachosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useApiQuery.mockReturnValue({ data: LOTES_EN_ESPERA, isLoading: false });
  });

  it('muestra los lotes EN_ESPERA en la tabla', () => {
    renderPage();
    expect(screen.getByText('Batido #10')).toBeInTheDocument();
  });

  it('despachar muestra modal de confirmación y llama a la API', async () => {
    mockDespacharLote.mockResolvedValue({});
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /despachar/i }));

    expect(screen.getByText(/confirmar despacho/i)).toBeInTheDocument();
    expect(screen.getByText(/esta acción es irreversible/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    await waitFor(() => {
      expect(mockDespacharLote).toHaveBeenCalledWith(1);
      expect(toastSuccess).toHaveBeenCalled();
    });
  });

  it('cancelar en el modal no llama a la API', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /despachar/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(mockDespacharLote).not.toHaveBeenCalled();
    expect(screen.queryByText(/confirmar despacho/i)).not.toBeInTheDocument();
  });
});
