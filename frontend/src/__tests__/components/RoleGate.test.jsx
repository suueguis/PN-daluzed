import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import RoleGate from '../../components/RoleGate';
import useAuthStore from '../../store/authStore';

function setUser(role) {
  useAuthStore.setState({
    accessToken: 'tkn',
    user: role ? { username: 'sam@daluzed.com', role } : null,
    loginAt: null,
    isAuthenticated: !!role,
    isLoading: false,
  });
}

describe('RoleGate', () => {
  beforeEach(() => {
    setUser(null);
  });

  it('oculta children cuando el rol no está permitido', () => {
    setUser('PRODUCCION');
    render(
      <RoleGate allowed={['ADMIN', 'GERENTE']}>
        <button>Botón admin</button>
      </RoleGate>,
    );
    expect(screen.queryByText('Botón admin')).toBeNull();
  });

  it('muestra children cuando el rol está permitido', () => {
    setUser('ADMIN');
    render(
      <RoleGate allowed={['ADMIN', 'GERENTE']}>
        <button>Botón admin</button>
      </RoleGate>,
    );
    expect(screen.getByText('Botón admin')).toBeInTheDocument();
  });

  it('oculta children cuando no hay usuario en sesión', () => {
    render(
      <RoleGate allowed={['*']}>
        <span>Visible</span>
      </RoleGate>,
    );
    expect(screen.queryByText('Visible')).toBeNull();
  });

  it('renderiza fallback cuando el rol no está permitido', () => {
    setUser('INVENTARIO');
    render(
      <RoleGate allowed={['ADMIN']} fallback={<span>Sin acceso</span>}>
        <button>Botón admin</button>
      </RoleGate>,
    );
    expect(screen.getByText('Sin acceso')).toBeInTheDocument();
  });

  it('acepta el alias `roles` para mantener compatibilidad', () => {
    setUser('GERENTE');
    render(
      <RoleGate roles={['GERENTE']}>
        <span>Visible</span>
      </RoleGate>,
    );
    expect(screen.getByText('Visible')).toBeInTheDocument();
  });
});
