import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NuevaRecepcionPage from '../pages/recepcion/NuevaRecepcionPage';

// ── mocks ────────────────────────────────────────────────────────────────────

vi.mock('../api/recepcionAPI', () => ({
  ordenesAPI:    { list: vi.fn() },
  recepcionesAPI: { list: vi.fn(), get: vi.fn(), create: vi.fn() },
  catalogoForRecepcion: {
    proveedores:    vi.fn(),
    materiasPrimas: vi.fn(),
    presentaciones: vi.fn(),
  },
}));

const toastWarning = vi.fn();
const toastSuccess = vi.fn();
const toastError   = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    warning: (...a) => toastWarning(...a),
    success: (...a) => toastSuccess(...a),
    error:   (...a) => toastError(...a),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── helpers ──────────────────────────────────────────────────────────────────

const { ordenesAPI, recepcionesAPI, catalogoForRecepcion } = await import('../api/recepcionAPI');

const ORDENES_MOCK = [
  { id: 7, proveedor: 'Prov. Test', fecha_creacion: '2026-05-01', estado: 'PENDIENTE' },
];

const MPS_MOCK = [
  { id: 1, nombre: 'Harina', dias_minimos_vencimiento: 90 },
  { id: 2, nombre: 'Azúcar', dias_minimos_vencimiento: null },
];

const PRES_MOCK = [
  { id: 10, nombre: 'Bulto 50kg' },
];

function setupMocks() {
  ordenesAPI.list.mockResolvedValue({ data: ORDENES_MOCK });
  catalogoForRecepcion.materiasPrimas.mockResolvedValue({ data: MPS_MOCK });
  catalogoForRecepcion.presentaciones.mockResolvedValue({ data: PRES_MOCK });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/recepcion/recepciones/nueva']}>
        <NuevaRecepcionPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ── future date helper ────────────────────────────────────────────────────────

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('NuevaRecepcionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renderiza el formulario con selects de OC, MP y presentación', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/OC-7/)).toBeInTheDocument();
    });

    expect(screen.getByText('Harina')).toBeInTheDocument();
    expect(screen.getByText('Bulto 50kg')).toBeInTheDocument();
  });

  it('muestra modal de justificación cuando el backend devuelve 400 por días insuficientes', async () => {
    recepcionesAPI.create.mockRejectedValue({
      response: {
        status: 400,
        data: {
          detail:
            "Vida útil insuficiente para 'Harina': quedan 10 días pero se requieren 90 (dias_minimos_vencimiento). Provee justificacion_vencimiento para continuar.",
        },
      },
    });

    renderPage();

    // Wait for dropdowns to populate
    await waitFor(() => expect(screen.getByText(/OC-7/)).toBeInTheDocument());

    // Fill form: OC
    const selects = screen.getAllByRole('combobox');
    await userEvent.selectOptions(selects[0], '7');   // OC
    await userEvent.selectOptions(selects[1], '1');   // MP (Harina)
    await userEvent.selectOptions(selects[2], '10');  // Presentación

    // Fill cantidad and fecha
    await userEvent.type(screen.getByLabelText(/cantidad/i), '5');
    await userEvent.type(screen.getByLabelText(/fecha de vencimiento/i), daysFromNow(10));

    await userEvent.click(screen.getByRole('button', { name: /registrar recepción/i }));

    await waitFor(() => {
      expect(screen.getByText(/justificación requerida/i)).toBeInTheDocument();
    });
  });

  it('reintenta el submit con justificación y navega al éxito (201)', async () => {
    // First call fails, second succeeds
    recepcionesAPI.create
      .mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            detail:
              "Vida útil insuficiente para 'Harina': quedan 10 días pero se requieren 90 (dias_minimos_vencimiento). Provee justificacion_vencimiento para continuar.",
          },
        },
      })
      .mockResolvedValueOnce({ data: { id: 42 } });

    renderPage();
    await waitFor(() => expect(screen.getByText(/OC-7/)).toBeInTheDocument());

    const selects = screen.getAllByRole('combobox');
    await userEvent.selectOptions(selects[0], '7');
    await userEvent.selectOptions(selects[1], '1');
    await userEvent.selectOptions(selects[2], '10');
    await userEvent.type(screen.getByLabelText(/cantidad/i), '5');
    await userEvent.type(screen.getByLabelText(/fecha de vencimiento/i), daysFromNow(10));

    await userEvent.click(screen.getByRole('button', { name: /registrar recepción/i }));

    // Modal appears
    await waitFor(() => expect(screen.getByText(/justificación requerida/i)).toBeInTheDocument());

    // Fill justification
    await userEvent.type(
      screen.getByRole('textbox', { name: /justificación de vencimiento/i }),
      'Proveedor certificó calidad extendida.',
    );

    await userEvent.click(
      screen.getByRole('button', { name: /confirmar con justificación/i }),
    );

    await waitFor(() => {
      expect(recepcionesAPI.create).toHaveBeenCalledTimes(2);
      expect(recepcionesAPI.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          justificacion_vencimiento: 'Proveedor certificó calidad extendida.',
        }),
      );
    });

    expect(toastSuccess).toHaveBeenCalledWith(expect.stringMatching(/registrada/i));
    expect(mockNavigate).toHaveBeenCalledWith('/recepcion/recepciones');
  });

  it('botón "Confirmar" en modal está deshabilitado hasta escribir justificación', async () => {
    recepcionesAPI.create.mockRejectedValue({
      response: {
        status: 400,
        data: { detail: 'justificacion_vencimiento requerida.' },
      },
    });

    renderPage();
    await waitFor(() => expect(screen.getByText(/OC-7/)).toBeInTheDocument());

    const selects = screen.getAllByRole('combobox');
    await userEvent.selectOptions(selects[0], '7');
    await userEvent.selectOptions(selects[1], '1');
    await userEvent.selectOptions(selects[2], '10');
    await userEvent.type(screen.getByLabelText(/cantidad/i), '5');
    await userEvent.type(screen.getByLabelText(/fecha de vencimiento/i), daysFromNow(10));
    await userEvent.click(screen.getByRole('button', { name: /registrar recepción/i }));

    await waitFor(() => expect(screen.getByText(/justificación requerida/i)).toBeInTheDocument());

    const confirmBtn = screen.getByRole('button', { name: /confirmar con justificación/i });
    expect(confirmBtn).toBeDisabled();
  });
});
