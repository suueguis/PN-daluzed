import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import MockAdapter from 'axios-mock-adapter';
import axiosClient from '../../../api/axiosClient';
import useAuthStore from '../../../store/authStore';
import BitacoraPage from '../../../pages/admin/BitacoraPage';

let mock;
let qc;

const BITACORA_FIXTURE = [
  {
    id: 1,
    usuario: 'admin@daluzed.com',
    accion: 'LOGIN',
    detalle: { email: 'admin@daluzed.com' },
    ip: '127.0.0.1',
    fecha: '2026-06-05T08:00:00',
  },
  {
    id: 2,
    usuario: 'admin@daluzed.com',
    accion: 'TRASLADO',
    detalle: { movimiento_id: 42 },
    ip: '127.0.0.1',
    fecha: '2026-06-05T09:30:00',
  },
];

beforeEach(() => {
  mock = new MockAdapter(axiosClient);
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.setState({ user: { role: 'ADMIN' }, isAuthenticated: true, accessToken: 'tkn' });
  mock.onGet('/auditoria/bitacora/').reply(200, { bitacora: BITACORA_FIXTURE, total: 2 });
});

afterEach(() => {
  mock.restore();
});

function renderPage() {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <BitacoraPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BitacoraPage', () => {
  it('muestra el título y filtros de búsqueda', () => {
    renderPage();
    expect(screen.getByText('Bitácora de operaciones')).toBeInTheDocument();
    expect(screen.getByLabelText(/acción/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/desde/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hasta/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /consultar/i })).toBeInTheDocument();
  });

  it('renderiza tabla con cabeceras correctas', async () => {
    renderPage();
    expect(await screen.findByText('Fecha')).toBeInTheDocument();
    expect(screen.getAllByText('Acción').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Usuario')).toBeInTheDocument();
    expect(screen.getByText('IP')).toBeInTheDocument();
    expect(screen.getByText('Detalle')).toBeInTheDocument();
  });

  it('muestra entradas de bitácora', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('admin@daluzed.com').length).toBeGreaterThanOrEqual(1),
    );
    expect(screen.getAllByText('127.0.0.1').length).toBeGreaterThanOrEqual(1);
  });

  it('muestra mensaje vacío cuando no hay entradas', async () => {
    mock.onGet('/auditoria/bitacora/').reply(200, { bitacora: [], total: 0 });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/sin entradas en el rango/i)).toBeInTheDocument(),
    );
  });

  it('aplica filtro de acción al hacer clic en Consultar', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('admin@daluzed.com').length).toBeGreaterThanOrEqual(1),
    );
    await user.selectOptions(screen.getByLabelText(/acción/i), 'LOGIN');
    await user.click(screen.getByRole('button', { name: /consultar/i }));
    await waitFor(() =>
      expect(screen.getAllByText('admin@daluzed.com').length).toBeGreaterThanOrEqual(1),
    );
  });
});
