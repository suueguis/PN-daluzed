import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import JornadaPage from '../../../pages/produccion/JornadaPage';

vi.mock('../../../hooks/useApi', () => ({ useApiQuery: vi.fn() }));
import { useApiQuery } from '../../../hooks/useApi';

const JORNADA = { total_batidos: 2, batidos_completados: 1, batidos_en_proceso: 1 };
const BATIDOS = [
  {
    id: 1,
    producto_terminado: 5,
    producto_terminado_nombre: 'Torta de vainilla',
    fecha_produccion: '2026-06-06',
    hora_inicio: '07:00',
    estado: 'COMPLETADO',
    usuario: 1,
    fecha_registro: '2026-06-06T07:00:00Z',
  },
  {
    id: 2,
    producto_terminado: 6,
    producto_terminado_nombre: 'Bizcocho de limón',
    fecha_produccion: '2026-06-06',
    hora_inicio: '09:30',
    estado: 'EN_PROCESO',
    usuario: 1,
    fecha_registro: '2026-06-06T09:30:00Z',
  },
];

function setup() {
  useApiQuery.mockImplementation((key) => {
    if (key[0] === 'jornada') return { data: JORNADA, isLoading: false };
    return { data: { results: BATIDOS }, isLoading: false };
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <JornadaPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('JornadaPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('muestra tarjetas de estadísticas de jornada', async () => {
    setup();
    expect(await screen.findByText('Total batidos')).toBeInTheDocument();
    expect(screen.getByText('Completados')).toBeInTheDocument();
    // "En proceso" aparece en la StatCard y en el Badge — verificamos la tarjeta
    expect(screen.getAllByText('En proceso').length).toBeGreaterThanOrEqual(1);
  });

  it('vista tabla muestra batidos con nombres de producto', async () => {
    setup();
    expect(await screen.findByText('Torta de vainilla')).toBeInTheDocument();
    expect(screen.getByText('Bizcocho de limón')).toBeInTheDocument();
  });

  it('toggle cambia a vista timeline', async () => {
    setup();
    const user = userEvent.setup();
    const btnTimeline = screen.getByRole('button', { name: /timeline/i });
    await user.click(btnTimeline);
    expect(btnTimeline).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText(/07:00/)).toBeInTheDocument();
    expect(screen.getByText(/09:30/)).toBeInTheDocument();
  });

  it('timeline muestra contador de máquinas en proceso', async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /timeline/i }));
    expect(await screen.findByText(/1 máquina en proceso/i)).toBeInTheDocument();
  });

  it('toggle vuelve a vista tabla', async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /timeline/i }));
    await user.click(screen.getByRole('button', { name: /tabla/i }));
    const btnTabla = screen.getByRole('button', { name: /tabla/i });
    expect(btnTabla).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('Torta de vainilla')).toBeInTheDocument();
  });
});
