import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CompensatoriosPage from '../../../pages/produccion/CompensatoriosPage';

// ── Mocks ──────────────────────────────────────────────────────────────
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...a) => toastSuccess(...a),
    error: (...a) => toastError(...a),
  },
}));

vi.mock('../../../api/produccionAPI', () => ({
  produccionAPI: {
    createCompensatorio: vi.fn(),
  },
}));

vi.mock('../../../hooks/useApi', () => ({
  useApiQuery: vi.fn(),
}));

import { useApiQuery } from '../../../hooks/useApi';
import { produccionAPI } from '../../../api/produccionAPI';

// ── Helpers ────────────────────────────────────────────────────────────
function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQC()}>
      <MemoryRouter>
        <CompensatoriosPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────
describe('CompensatoriosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useApiQuery.mockReturnValue({ data: [], isLoading: false });
  });

  it('submit con JSON inválido en datos_originales marca error de validación', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /nuevo compensatorio/i }));

    // Verify modal opened by checking for dialog role
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Fill required fields
    await userEvent.selectOptions(screen.getByLabelText(/tipo afectado/i), 'Lote');
    await userEvent.type(screen.getByLabelText(/id afectado/i), '5');

    // Enter invalid JSON in datos_originales
    const allTextboxes = screen.getAllByRole('textbox');
    const datosOriginalesTA = allTextboxes.find((ta) =>
      ta.getAttribute('placeholder')?.includes('10'),
    );
    await userEvent.type(datosOriginalesTA, 'esto no es json');

    // Enter valid JSON in datos_corregidos — use fireEvent.change to avoid {/} escaping issues
    const datosCorregidosTA = allTextboxes.find((ta) =>
      ta.getAttribute('placeholder')?.includes('8}'),
    );
    fireEvent.change(datosCorregidosTA, { target: { value: '{"cantidad": 8}' } });

    // Fill descripción
    const descripcionTA = allTextboxes.find((ta) =>
      ta.getAttribute('placeholder')?.includes('Motivo'),
    );
    await userEvent.type(descripcionTA, 'Ajuste manual');

    // Submit
    await userEvent.click(screen.getByRole('button', { name: /^guardar$/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/json inválido/i).length).toBeGreaterThan(0);
    });

    expect(produccionAPI.createCompensatorio).not.toHaveBeenCalled();
  });

  it('submit con datos válidos llama a la API', async () => {
    produccionAPI.createCompensatorio.mockResolvedValue({ data: {} });
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /nuevo compensatorio/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText(/tipo afectado/i), 'Lote');
    await userEvent.type(screen.getByLabelText(/id afectado/i), '5');

    const allTextboxes = screen.getAllByRole('textbox');
    const datosOriginalesTA = allTextboxes.find((ta) =>
      ta.getAttribute('placeholder')?.includes('10'),
    );
    fireEvent.change(datosOriginalesTA, { target: { value: '{"cantidad": 10}' } });

    const datosCorregidosTA = allTextboxes.find((ta) =>
      ta.getAttribute('placeholder')?.includes('8}'),
    );
    fireEvent.change(datosCorregidosTA, { target: { value: '{"cantidad": 8}' } });

    const descripcionTA = allTextboxes.find((ta) =>
      ta.getAttribute('placeholder')?.includes('Motivo'),
    );
    await userEvent.type(descripcionTA, 'Corrección de stock');

    await userEvent.click(screen.getByRole('button', { name: /^guardar$/i }));

    await waitFor(() => {
      expect(produccionAPI.createCompensatorio).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_afectado: 'Lote',
          id_afectado: 5,
          datos_originales: { cantidad: 10 },
          datos_corregidos: { cantidad: 8 },
          descripcion: 'Corrección de stock',
        }),
      );
    });
  });
});
