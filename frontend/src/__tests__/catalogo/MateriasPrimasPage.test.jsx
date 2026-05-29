import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import MockAdapter from 'axios-mock-adapter';
import axiosClient from '../../api/axiosClient';
import MateriasPrimasPage from '../../pages/catalogo/MateriasPrimasPage';

let mock;
let qc;

const mpRows = [
  {
    id: 1,
    nombre: 'Harina trigo',
    categoria: 'GALLETERIA',
    condicion_almacenamiento: 'AMBIENTE',
    punto_reorden: '5.00',
    activo: true,
    unidad_medida: 1,
    unidad_medida_detalle: { id: 1, nombre: 'Kilogramo', simbolo: 'kg', activo: true },
  },
  {
    id: 2,
    nombre: 'Leche',
    categoria: 'GENERAL',
    condicion_almacenamiento: 'REFRIGERACION',
    punto_reorden: '10.00',
    activo: true,
    unidad_medida: 2,
    unidad_medida_detalle: { id: 2, nombre: 'Litro', simbolo: 'L', activo: true },
  },
];

const unidades = [
  { id: 1, nombre: 'Kilogramo', simbolo: 'kg', activo: true },
  { id: 2, nombre: 'Litro', simbolo: 'L', activo: true },
];

beforeEach(() => {
  mock = new MockAdapter(axiosClient);
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  mock.restore();
});

function renderPage() {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MateriasPrimasPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MateriasPrimasPage', () => {
  it('renderiza tabla con datos mock del API', async () => {
    mock.onGet('/catalogo/materias-primas/').reply(200, { results: mpRows });
    mock.onGet('/catalogo/unidades-medida/').reply(200, { results: unidades });

    renderPage();

    expect(await screen.findByText('Harina trigo')).toBeInTheDocument();
    expect(screen.getByText('Leche')).toBeInTheDocument();
    expect(screen.getByText('kg')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();
  });

  it('muestra empty state cuando el API no devuelve filas', async () => {
    mock.onGet('/catalogo/materias-primas/').reply(200, { results: [] });
    mock.onGet('/catalogo/unidades-medida/').reply(200, { results: [] });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/Sin materias primas/i)).toBeInTheDocument(),
    );
  });
});
