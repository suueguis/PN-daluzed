import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import MockAdapter from 'axios-mock-adapter';
import axiosClient from '../api/axiosClient';
import useAuthStore from '../store/authStore';
import UsuariosPage from '../pages/admin/UsuariosPage';
import RoleGate from '../components/RoleGate';

const USUARIOS = [
  { id: 1, email: 'admin@daluzed.com',    role: 'ADMIN',      is_active: true,  date_joined: '2026-01-01' },
  { id: 2, email: 'inv@daluzed.com',      role: 'INVENTARIO', is_active: true,  date_joined: '2026-01-02' },
  { id: 3, email: 'inactivo@daluzed.com', role: 'GERENTE',    is_active: false, date_joined: '2026-01-03' },
];

let mock;
let qc;

function setUser(role) {
  useAuthStore.setState({
    accessToken: 'tkn',
    user: { username: 'admin@daluzed.com', role },
    isAuthenticated: true,
    isLoading: false,
  });
}

function renderPage() {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/admin/usuarios']}>
        <Routes>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route
            path="/admin/usuarios"
            element={
              <RoleGate allowed={['ADMIN']} fallback={<Navigate to="/dashboard" replace />}>
                <UsuariosPage />
              </RoleGate>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mock = new MockAdapter(axiosClient);
  mock.onGet('/auth/usuarios/').reply(200, USUARIOS);
  setUser('ADMIN');
});

afterEach(() => {
  mock.restore();
});

describe('UsuariosPage — tabla', () => {
  it('muestra los usuarios al cargar', async () => {
    renderPage();
    expect(await screen.findByText('inv@daluzed.com')).toBeInTheDocument();
    expect(screen.getByText('inactivo@daluzed.com')).toBeInTheDocument();
  });

  it('muestra badge Inactivo para usuario desactivado', async () => {
    renderPage();
    await screen.findByText('inactivo@daluzed.com');
    const badges = screen.getAllByText('Inactivo');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('no muestra botón Desactivar para la propia cuenta del admin', async () => {
    renderPage();
    await screen.findByText('admin@daluzed.com');
    // The admin row should not have a Desactivar button (self-protection)
    const rows = screen.getAllByRole('row');
    const adminRow = rows.find((r) => r.textContent.includes('admin@daluzed.com'));
    expect(adminRow?.querySelector('button')).toBeNull();
  });

  it('redirige a /dashboard para roles no-ADMIN', async () => {
    setUser('INVENTARIO');
    renderPage();
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });
});

describe('UsuariosPage — crear usuario', () => {
  it('abre modal y crea usuario con datos válidos', async () => {
    const user = userEvent.setup();
    mock.onPost('/auth/usuarios/').reply(201, {
      id: 4, email: 'nuevo@daluzed.com', role: 'PRODUCCION', is_active: true, date_joined: '2026-06-04',
    });
    renderPage();
    await screen.findByText('inv@daluzed.com');

    await user.click(screen.getByRole('button', { name: /nuevo usuario/i }));
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/correo electrónico/i), 'nuevo@daluzed.com');
    await user.type(screen.getByLabelText(/contraseña temporal/i), 'Daluzed2026!');
    await user.click(screen.getByRole('button', { name: /crear usuario/i }));

    await waitFor(() => {
      expect(mock.history.post.some((r) => r.url === '/auth/usuarios/')).toBe(true);
    });
  });
});

describe('UsuariosPage — desactivar', () => {
  it('muestra ConfirmDialog al pulsar Desactivar', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('inv@daluzed.com');

    const btns = screen.getAllByRole('button', { name: /desactivar/i });
    await user.click(btns[0]);

    // Stage 1: warning message visible
    expect(screen.getByText(/no podrá iniciar sesión/i)).toBeInTheDocument();
  });

  it('llama al endpoint de desactivar cuando se confirma con el email', async () => {
    const user = userEvent.setup();
    mock.onPost('/auth/usuarios/2/desactivar/').reply(200, {
      id: 2, email: 'inv@daluzed.com', role: 'INVENTARIO', is_active: false, date_joined: '2026-01-02',
    });
    renderPage();
    await screen.findByText('inv@daluzed.com');

    const btns = screen.getAllByRole('button', { name: /desactivar/i });
    await user.click(btns[0]);

    // Advance past warning stage
    await user.click(screen.getByRole('button', { name: /continuar/i }));

    // Type the confirm word
    const input = screen.getByLabelText(/confirmación/i);
    await user.type(input, 'inv@daluzed.com');

    // Multiple "Desactivar" buttons exist (table + dialog) — click the last one (dialog confirm)
    const confirmBtns = screen.getAllByRole('button', { name: /desactivar/i });
    await user.click(confirmBtns[confirmBtns.length - 1]);

    await waitFor(() => {
      expect(mock.history.post.some((r) => r.url === '/auth/usuarios/2/desactivar/')).toBe(true);
    });
  });
});
