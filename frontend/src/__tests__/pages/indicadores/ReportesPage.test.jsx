import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import MockAdapter from 'axios-mock-adapter';
import axiosClient from '../../../api/axiosClient';
import useAuthStore from '../../../store/authStore';
import ReportesPage from '../../../pages/indicadores/ReportesPage';

let mock;
let qc;

const SEMANAS_FIXTURE = [
  {
    semana_inicio: '2026-05-25',
    batidos: 3,
    recepciones: 2,
    despachos: 1,
    unidades_despachadas: '40.00',
  },
  {
    semana_inicio: '2026-06-01',
    batidos: 5,
    recepciones: 4,
    despachos: 3,
    unidades_despachadas: '120.00',
  },
];

beforeEach(() => {
  mock = new MockAdapter(axiosClient);
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.setState({ user: { role: 'GERENTE' }, isAuthenticated: true, accessToken: 'tkn' });

  mock.onGet('/indicadores/reporte-semanal/').reply((config) => {
    if (config.params?.formato === 'xlsx') return [200, new Blob()];
    return [200, { desde: '2026-05-08', hasta: '2026-06-05', semanas: SEMANAS_FIXTURE }];
  });
});

afterEach(() => {
  mock.restore();
});

function renderPage() {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ReportesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ReportesPage', () => {
  it('renderiza filtros desde/hasta y botón Consultar', () => {
    renderPage();
    expect(screen.getByLabelText(/desde/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hasta/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /consultar/i })).toBeInTheDocument();
  });

  it('muestra botón Exportar Excel', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /exportar excel/i })).toBeInTheDocument();
  });

  it('renderiza tabla con cabeceras correctas tras cargar datos', async () => {
    renderPage();
    expect(await screen.findByText('Semana (inicio)')).toBeInTheDocument();
    expect(screen.getByText('Batidos')).toBeInTheDocument();
    expect(screen.getByText('Recepciones')).toBeInTheDocument();
    expect(screen.getByText('Despachos')).toBeInTheDocument();
    expect(screen.getByText('Unidades despachadas')).toBeInTheDocument();
  });

  it('muestra datos de semanas en la tabla', async () => {
    renderPage();
    expect(await screen.findByText('2026-05-25')).toBeInTheDocument();
    expect(screen.getByText('2026-06-01')).toBeInTheDocument();
  });

  it('muestra mensaje vacío cuando no hay operaciones', async () => {
    mock.onGet('/indicadores/reporte-semanal/').reply(200, {
      desde: '2026-05-08',
      hasta: '2026-06-05',
      semanas: [],
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/sin operaciones en el rango/i)).toBeInTheDocument(),
    );
  });

  it('refetch al hacer click en Consultar', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('2026-05-25');
    await user.click(screen.getByRole('button', { name: /consultar/i }));
    expect(await screen.findByText('2026-05-25')).toBeInTheDocument();
  });
});
