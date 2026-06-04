import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('sonner', () => ({
  toast: {
    warning: vi.fn().mockReturnValue('warn-id'),
    dismiss: vi.fn(),
  },
}));

import { toast } from 'sonner';
import useInactivityLogout from '../../hooks/useInactivityLogout';

const wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;

describe('useInactivityLogout', () => {
  let clearAuth;

  beforeEach(() => {
    vi.useFakeTimers();
    clearAuth = vi.fn();
    useAuthStore.setState({ accessToken: 'test-token', clearAuth });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('no inicia timers cuando no hay accessToken', () => {
    useAuthStore.setState({ accessToken: null, clearAuth });
    renderHook(() => useInactivityLogout(30), { wrapper });
    act(() => { vi.advanceTimersByTime(28 * 60 * 1000); });
    expect(toast.warning).not.toHaveBeenCalled();
    expect(clearAuth).not.toHaveBeenCalled();
  });

  it('muestra advertencia 2 minutos antes del cierre de sesión', () => {
    renderHook(() => useInactivityLogout(30), { wrapper });
    act(() => { vi.advanceTimersByTime(28 * 60 * 1000); });
    expect(toast.warning).toHaveBeenCalledWith(
      'Tu sesión expirará en 2 minutos por inactividad.',
      expect.any(Object),
    );
  });

  it('llama clearAuth y navega a /login tras el timeout completo', () => {
    renderHook(() => useInactivityLogout(30), { wrapper });
    act(() => { vi.advanceTimersByTime(30 * 60 * 1000); });
    expect(clearAuth).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('resetea el temporizador al detectar actividad del usuario', () => {
    renderHook(() => useInactivityLogout(30), { wrapper });
    act(() => { vi.advanceTimersByTime(25 * 60 * 1000); });
    act(() => { window.dispatchEvent(new MouseEvent('mousemove')); });
    act(() => { vi.advanceTimersByTime(25 * 60 * 1000); });
    expect(toast.warning).not.toHaveBeenCalled();
    expect(clearAuth).not.toHaveBeenCalled();
  });

  it('limpia timers al desmontar', () => {
    const { unmount } = renderHook(() => useInactivityLogout(30), { wrapper });
    unmount();
    act(() => { vi.advanceTimersByTime(30 * 60 * 1000); });
    expect(clearAuth).not.toHaveBeenCalled();
  });
});
