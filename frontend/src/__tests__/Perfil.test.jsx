import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import Perfil from '../pages/Perfil';

const cambiarContrasenaAPI = vi.fn();
const logoutAPI = vi.fn();
vi.mock('../api/authAPI', () => ({
  logoutAPI: (...args) => logoutAPI(...args),
  cambiarContrasenaAPI: (...args) => cambiarContrasenaAPI(...args),
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

function renderPerfil() {
  return render(
    <MemoryRouter>
      <Perfil />
    </MemoryRouter>,
  );
}

describe('Perfil — cambio de contraseña', () => {
  beforeEach(() => {
    cambiarContrasenaAPI.mockReset();
    logoutAPI.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
    navigate.mockReset();

    useAuthStore.setState({
      accessToken: 'token',
      user: { username: 'sam@daluzed.com', role: 'INVENTARIO' },
      loginAt: '2026-06-03T10:00:00Z',
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it('muestra la sección de cambio de contraseña con los tres campos', () => {
    renderPerfil();
    expect(screen.getByTestId('cambio-contrasena-section')).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña actual/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nueva contraseña$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar nueva contraseña/i)).toBeInTheDocument();
  });

  it('envía la solicitud y muestra toast de éxito cuando todo es válido', async () => {
    cambiarContrasenaAPI.mockResolvedValue({ data: { detail: 'ok' } });

    renderPerfil();

    await userEvent.type(screen.getByLabelText(/contraseña actual/i), 'Daluzed2026!');
    await userEvent.type(screen.getByLabelText(/^nueva contraseña$/i), 'NuevaClave2026$');
    await userEvent.type(
      screen.getByLabelText(/confirmar nueva contraseña/i),
      'NuevaClave2026$',
    );
    await userEvent.click(screen.getByRole('button', { name: /actualizar contraseña/i }));

    await waitFor(() => {
      expect(cambiarContrasenaAPI).toHaveBeenCalledWith(
        'Daluzed2026!',
        'NuevaClave2026$',
        'NuevaClave2026$',
      );
    });
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringMatching(/actualizada/i));
    expect(screen.getByLabelText(/contraseña actual/i)).toHaveValue('');
  });

  it('no llama al API y muestra error si la confirmación no coincide', async () => {
    renderPerfil();

    await userEvent.type(screen.getByLabelText(/contraseña actual/i), 'Daluzed2026!');
    await userEvent.type(screen.getByLabelText(/^nueva contraseña$/i), 'NuevaClave2026$');
    await userEvent.type(
      screen.getByLabelText(/confirmar nueva contraseña/i),
      'Distinta2026$',
    );
    await userEvent.click(screen.getByRole('button', { name: /actualizar contraseña/i }));

    expect(cambiarContrasenaAPI).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/no coinciden/i));
  });

  it('muestra el error del backend cuando la contraseña actual es incorrecta', async () => {
    cambiarContrasenaAPI.mockRejectedValue({
      response: {
        status: 400,
        data: { contrasena_actual: ['La contraseña actual es incorrecta.'] },
      },
    });

    renderPerfil();

    await userEvent.type(screen.getByLabelText(/contraseña actual/i), 'mala');
    await userEvent.type(screen.getByLabelText(/^nueva contraseña$/i), 'NuevaClave2026$');
    await userEvent.type(
      screen.getByLabelText(/confirmar nueva contraseña/i),
      'NuevaClave2026$',
    );
    await userEvent.click(screen.getByRole('button', { name: /actualizar contraseña/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('La contraseña actual es incorrecta.');
    });
  });

  it('no envía el formulario si algún campo está vacío', async () => {
    renderPerfil();
    await userEvent.click(screen.getByRole('button', { name: /actualizar contraseña/i }));
    expect(cambiarContrasenaAPI).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/obligatorios/i));
  });
});
