import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import MockAdapter from 'axios-mock-adapter';
import axiosClient from '../api/axiosClient';
import KardexPage from '../pages/inventario/KardexPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const { toast } = await import('sonner');

let mock;

const MP_LIST = [
  { id: 1, nombre: 'Azúcar' },
  { id: 2, nombre: 'Harina' },
];

const KARDEX_ROWS = [
  {
    id: 1, fecha: '2026-06-01T10:00:00Z', tipo: 'RECEPCION',
    numero_lote: 'L-001', lote: 1,
    bodega_origen_nombre: null, bodega_destino_nombre: 'BP',
    cantidad: '500.00', saldo: '500.00', usuario_email: 'user@x.com',
  },
  {
    id: 2, fecha: '2026-06-02T10:00:00Z', tipo: 'CONSUMO',
    numero_lote: 'L-001', lote: 1,
    bodega_origen_nombre: 'BP', bodega_destino_nombre: null,
    cantidad: '200.00', saldo: '300.00', usuario_email: 'user@x.com',
  },
];

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <KardexPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function waitForMPs() {
  return screen.findByRole('option', { name: 'Azúcar' });
}

beforeEach(() => {
  mock = new MockAdapter(axiosClient);
  mock.onGet('/catalogo/materias-primas/').reply(200, MP_LIST);
  vi.clearAllMocks();
});

afterEach(() => {
  mock.restore();
});

describe('KardexPage', () => {
  it('muestra empty state inicial cuando no hay MP seleccionada', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: /selecciona una materia prima/i })).toBeInTheDocument();
  });

  it('no dispara query de kardex si no hay MP seleccionada', async () => {
    renderPage();
    await screen.findByRole('heading', { name: /selecciona una materia prima/i });
    expect(mock.history.get.filter((r) => r.url.includes('kardex'))).toHaveLength(0);
  });

  it('muestra filas de la tabla cuando hay datos', async () => {
    mock.onGet('/inventario/kardex/').reply(200, KARDEX_ROWS);
    renderPage();

    await waitForMPs();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });

    expect(await screen.findByText('Recepción')).toBeInTheDocument();
    expect(screen.getByText('Consumo')).toBeInTheDocument();
  });

  it('muestra empty state "Sin movimientos" cuando MP tiene 0 movimientos', async () => {
    mock.onGet('/inventario/kardex/').reply(200, []);
    renderPage();

    await waitForMPs();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });

    expect(await screen.findByRole('heading', { name: /sin movimientos/i })).toBeInTheDocument();
  });

  it('llama toast.error con formatApiError cuando la query falla', async () => {
    mock.onGet('/inventario/kardex/').reply(500, { detail: 'Error interno' });
    renderPage();

    await waitForMPs();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
