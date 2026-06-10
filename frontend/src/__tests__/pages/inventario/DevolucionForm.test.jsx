import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import DevolucionForm from '../../../pages/inventario/DevolucionForm';

const createMutate = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('../../../hooks/inventario/useInventario', () => ({
  useCreateDevolucion: vi.fn(() => ({ mutateAsync: createMutate, isPending: false })),
}));
vi.mock('../../../hooks/useApi', () => ({
  useApiQuery: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: { success: (...a) => toastSuccess(...a), error: (...a) => toastError(...a) },
}));

import { useApiQuery } from '../../../hooks/useApi';

const LOTE = {
  id: 3,
  numero_lote: 'L-003',
  materia_prima_nombre: 'Azúcar',
  bodega_nombre: 'Bodega Principal',
  cantidad: '500',
  fecha_vencimiento: '2026-01-01',
};

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

// Helper: fills the form and completes the two-step ConfirmDialog
async function fillAndConfirm() {
  await userEvent.selectOptions(screen.getByLabelText(/Proveedor/i), '1');
  await userEvent.type(screen.getByPlaceholderText(/Describe el motivo/i), 'Lote vencido por error de recepción');
  await userEvent.click(screen.getByRole('button', { name: /Registrar Devolución/i }));

  // Stage 1: warn → click Continuar
  await waitFor(() => expect(screen.getByRole('button', { name: /Continuar/i })).toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: /Continuar/i }));

  // Stage 2: type confirmWord (loteCode = 'L-003') then click confirmLabel
  await waitFor(() => expect(screen.getByPlaceholderText('L-003')).toBeInTheDocument());
  await userEvent.type(screen.getByPlaceholderText('L-003'), 'L-003');
  await userEvent.click(screen.getByRole('button', { name: /Confirmar devolución/i }));
}

describe('DevolucionForm', () => {
  beforeEach(() => {
    createMutate.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    useApiQuery.mockReturnValue({ data: [{ id: 1, nombre: 'Proveedor ABC' }] });
  });

  it('muestra los datos del lote', () => {
    render(<DevolucionForm lote={LOTE} />, { wrapper });
    expect(screen.getByText(/L-003/)).toBeInTheDocument();
    expect(screen.getByText(/Azúcar/)).toBeInTheDocument();
  });

  it('requiere proveedor y motivo', async () => {
    render(<DevolucionForm lote={LOTE} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Registrar Devolución/i }));
    expect(await screen.findByText(/Selecciona un proveedor/i)).toBeInTheDocument();
    expect(createMutate).not.toHaveBeenCalled();
  });

  it('llama mutateAsync con datos correctos y muestra toast success', async () => {
    createMutate.mockResolvedValue({});
    render(<DevolucionForm lote={LOTE} />, { wrapper });

    await fillAndConfirm();

    await waitFor(() => {
      expect(createMutate).toHaveBeenCalledWith({
        lote_id: 3,
        proveedor_id: 1,
        motivo: 'Lote vencido por error de recepción',
      });
    });
    expect(toastSuccess).toHaveBeenCalledWith('Devolución registrada');
  });

  it('muestra toast error si falla el submit', async () => {
    createMutate.mockRejectedValue({ response: { data: { detail: 'Error de servidor' } } });
    render(<DevolucionForm lote={LOTE} />, { wrapper });

    await fillAndConfirm();

    await waitFor(() => expect(toastError).toHaveBeenCalled());
  });
});
