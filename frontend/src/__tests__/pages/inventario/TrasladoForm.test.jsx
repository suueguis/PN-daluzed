import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import TrasladoForm from '../../../pages/inventario/TrasladoForm';

const createMutate = vi.fn();

vi.mock('../../../hooks/inventario/useInventario', () => ({
  useFefo: vi.fn(),
  useBodegas: vi.fn(),
  useCreateTraslado: vi.fn(() => ({ mutateAsync: createMutate, isPending: false })),
}));
vi.mock('../../../hooks/useApi', () => ({
  useApiQuery: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useFefo, useBodegas } from '../../../hooks/inventario/useInventario';
import { useApiQuery } from '../../../hooks/useApi';

const FEFO_DATA = {
  lote_sugerido: { id: 5, numero_lote: 'L-005', cantidad: '3000', fecha_vencimiento: '2026-06-01' },
  lotes: [
    { id: 5, numero_lote: 'L-005', cantidad: '3000', fecha_vencimiento: '2026-06-01' },
    { id: 6, numero_lote: 'L-006', cantidad: '1500', fecha_vencimiento: '2026-08-01' },
  ],
};

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('TrasladoForm', () => {
  beforeEach(() => {
    createMutate.mockReset();
    useApiQuery.mockReturnValue({ data: [{ id: 10, nombre: 'Harina de trigo' }] });
    useBodegas.mockReturnValue({ data: [{ id: 2, nombre: 'Bodega PDP', tipo: 'PDP' }] });
    useFefo.mockReturnValue({ data: null, isLoading: false });
  });

  it('muestra el select de materia prima', () => {
    render(<TrasladoForm />, { wrapper });
    // La etiqueta es el texto exacto "Materia Prima" (la opción es "Selecciona materia prima")
    expect(screen.getByText('Materia Prima')).toBeInTheDocument();
  });

  it('muestra sugerencia FEFO y badge cuando hay lote sugerido', async () => {
    useFefo.mockReturnValue({ data: FEFO_DATA, isLoading: false });
    render(<TrasladoForm defaultMpId="10" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Sugerencia FEFO')).toBeInTheDocument();
    });
    expect(screen.getByText(/★/)).toBeInTheDocument();
  });

  it('auto-selecciona el lote FEFO sugerido', async () => {
    useFefo.mockReturnValue({ data: FEFO_DATA, isLoading: false });
    render(<TrasladoForm defaultMpId="10" />, { wrapper });

    await waitFor(() => {
      // El lote sugerido debe aparecer con el prefijo ★ en el select
      const loteOption = screen.getByText(/★/);
      expect(loteOption).toBeInTheDocument();
    });
  });

  it('muestra spinner mientras carga FEFO', async () => {
    useFefo.mockReturnValue({ data: null, isLoading: true });
    render(<TrasladoForm defaultMpId="10" />, { wrapper });
    expect(screen.getByText(/Cargando lotes disponibles/i)).toBeInTheDocument();
  });

  it('llama mutateAsync con los datos correctos al enviar', async () => {
    createMutate.mockResolvedValue({});
    useFefo.mockReturnValue({ data: FEFO_DATA, isLoading: false });
    render(<TrasladoForm defaultMpId="10" />, { wrapper });

    await waitFor(() => screen.getByText('Sugerencia FEFO'));

    const cantidadInput = screen.getByPlaceholderText(/ej\. 250\.00/i);
    await userEvent.clear(cantidadInput);
    await userEvent.type(cantidadInput, '500');

    const bodegaSelect = screen.getByLabelText(/Bodega Destino/i);
    await userEvent.selectOptions(bodegaSelect, '2');

    await userEvent.click(screen.getByRole('button', { name: /Registrar Traslado/i }));

    await waitFor(() => {
      expect(createMutate).toHaveBeenCalledWith({
        lote_id: 5,
        bodega_destino: 2,
        cantidad: 500,
        notas: '',
      });
    });
  });
});
