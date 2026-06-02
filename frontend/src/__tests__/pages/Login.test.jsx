import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import Login from '../../pages/Login';

const loginAPI = vi.fn();
vi.mock('../api/authAPI', () => ({
  loginAPI: (...args) => loginAPI(...args),
  logoutAPI: vi.fn(),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args) => toastError(...args),
    success: (...args) => toastSuccess(...args),
  },
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe('Login', () => {
  beforeEach(() => {
    loginAPI.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
    navigate.mockReset();
    useAuthStore.setState({
      accessToken: null,
      user: null,
      loginAt: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('llama al API con credenciales válidas y navega a /dashboard', async () => {
    loginAPI.mockResolvedValue({
      data: { access: 'a.b.c', refresh: 'r', username: 'sam@daluzed.com', role: 'ADMIN' },
    });

    renderLogin();

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'sam@daluzed.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(loginAPI).toHaveBeenCalledWith('sam@daluzed.com', 'secret123');
    });
    expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    expect(useAuthStore.getState().user).toEqual({
      username: 'sam@daluzed.com',
      role: 'ADMIN',
    });
  });

  it('muestra toast cuando las credenciales son inválidas (401)', async () => {
    loginAPI.mockRejectedValue({
      response: {
        status: 401,
        data: { detail: 'invalid', remaining_attempts: 3 },
      },
    });

    renderLogin();

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'sam@daluzed.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
    });
    expect(toastError.mock.calls[0][0]).toMatch(/incorrectos/i);
    expect(toastError.mock.calls[0][0]).toMatch(/3/);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('muestra mensaje específico cuando la cuenta está bloqueada', async () => {
    loginAPI.mockRejectedValue({
      response: { status: 401, data: { detail: 'lockout' } },
    });

    renderLogin();

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'sam@daluzed.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'whatever');
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
    });
    expect(toastError.mock.calls[0][0]).toMatch(/bloqueada/i);
  });

  it('marca errores de validación cuando el correo es inválido', async () => {
    renderLogin();

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'no-es-email');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'x');
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(await screen.findByText(/correo inválido/i)).toBeInTheDocument();
    expect(loginAPI).not.toHaveBeenCalled();
  });
});
