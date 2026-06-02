import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NuevoBatidoPage from '../../../pages/produccion/NuevoBatidoPage';

// ── Mocks ──────────────────────────────────────────────────────────────
const toastError = vi.fn();
const toastSuccess = vi.fn();
const toastInfo = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...a) => toastError(...a),
    success: (...a) => toastSuccess(...a),
    info: (...a) => toastInfo(...a),
  },
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const mockSugerenciaFEFO = vi.fn();
vi.mock('../../../api/produccionAPI', () => ({
  produccionAPI: {
    sugerenciaFEFO: (...a) => mockSugerenciaFEFO(...a),
    listLotesPorMP: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

const mockMutate = vi.fn();
let capturedOnError;
vi.mock('../../../hooks/useApi', () => ({
  useApiQuery: vi.fn(),
  useApiMutation: vi.fn(),
}));

import { useApiQuery, useApiMutation } from '../../../hooks/useApi';

// ── Helpers ────────────────────────────────────────────────────────────
function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQC()}>
      <MemoryRouter initialEntries={['/produccion/batidos/nuevo']}>
        <NuevoBatidoPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────
describe('NuevoBatidoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useApiQuery.mockImplementation(([key]) => {
      if (key === 'productos-terminados') {
        return {
          data: [{ id: 1, nombre: 'Torta de chocolate' }],
          isLoading: false,
        };
      }
      if (key === 'materias-primas') {
        return {
          data: [{ id: 10, nombre: 'Harina' }],
          isLoading: false,
        };
      }
      return { data: [], isLoading: false };
    });

    useApiMutation.mockImplementation(({ onError }) => {
      capturedOnError = onError;
      return { mutate: mockMutate, isPending: false };
    });
  });

  it('sugerir FEFO rellena la tabla de ingredientes', async () => {
    mockSugerenciaFEFO.mockResolvedValue({
      data: {
        sugerencias: [
          {
            materia_prima_id: 10,
            materia_prima_nombre: 'Harina',
            lote_id: 5,
            fecha_vencimiento: '2026-07-01',
            cantidad_disponible: 25,
          },
          {
            materia_prima_id: 11,
            materia_prima_nombre: 'Azúcar',
            lote_id: 6,
            fecha_vencimiento: '2026-08-15',
            cantidad_disponible: 10,
          },
        ],
      },
    });

    renderPage();

    // Select a product to enable the FEFO button
    await userEvent.selectOptions(
      screen.getByLabelText(/producto terminado/i),
      '1',
    );

    await userEvent.click(screen.getByRole('button', { name: /sugerir fefo/i }));

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
      expect(screen.getByText('Azúcar')).toBeInTheDocument();
    });

    expect(mockSugerenciaFEFO).toHaveBeenCalledWith('1');
  });

  it('error de stock insuficiente muestra toast con el mensaje del backend', async () => {
    renderPage();

    // capturedOnError is set by useApiMutation mock during render.
    // Call it directly to verify the error-handling branch without needing form submission.
    capturedOnError({
      response: {
        data: {
          detail:
            "Stock insuficiente para 'Harina': faltante 0.50 (disponible 1.00, requerido 1.50).",
        },
      },
    });

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
      expect(toastError.mock.calls[0][0]).toMatch(/faltante/);
      expect(toastError.mock.calls[0][0]).toMatch(/Harina/);
    });
  });
});
