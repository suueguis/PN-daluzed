import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MockAdapter from 'axios-mock-adapter';
import axiosClient from '../../../api/axiosClient';
import DetalleRecepcionPage from '../../../pages/recepcion/DetalleRecepcionPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const { toast } = await import('sonner');

let mock;

const RECEPCION = {
  id: 1,
  orden_compra: 2,
  fecha: '2026-06-01',
  usuario: 'inv@daluzed.com',
  confirmada: true,
  justificacion_vencimiento: '',
};

function renderPage(id = '1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/recepcion/${id}`]}>
        <Routes>
          <Route path="/recepcion/:id" element={<DetalleRecepcionPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mock = new MockAdapter(axiosClient);
  vi.clearAllMocks();
});

afterEach(() => {
  mock.restore();
});

describe('DetalleRecepcionPage', () => {
  it('muestra el botón "Descargar PDF" en lugar de "Imprimir"', async () => {
    mock.onGet('/recepcion/1/').reply(200, RECEPCION);
    renderPage();
    expect(await screen.findByRole('button', { name: /descargar pdf/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /imprimir/i })).not.toBeInTheDocument();
  });

  it('descarga el PDF al pulsar el botón', async () => {
    mock.onGet('/recepcion/1/').reply(200, RECEPCION);
    mock.onGet('/recepcion/1/pdf/').reply(200, new Blob(['%PDF'], { type: 'application/pdf' }));

    const createObjURL = vi.fn(() => 'blob:test');
    const revokeObjURL = vi.fn();
    global.URL.createObjectURL = createObjURL;
    global.URL.revokeObjectURL = revokeObjURL;

    renderPage();
    const btn = await screen.findByRole('button', { name: /descargar pdf/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mock.history.get.some((r) => r.url.includes('/recepcion/1/pdf/'))).toBe(true);
    });
  });

  it('muestra toast.error si falla la descarga', async () => {
    mock.onGet('/recepcion/1/').reply(200, RECEPCION);
    mock.onGet('/recepcion/1/pdf/').reply(500);

    renderPage();
    const btn = await screen.findByRole('button', { name: /descargar pdf/i });
    fireEvent.click(btn);

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it('muestra error cuando la recepción no carga', async () => {
    mock.onGet('/recepcion/1/').reply(404);
    renderPage();
    expect(await screen.findByText(/no se pudo cargar la recepción/i)).toBeInTheDocument();
  });
});
