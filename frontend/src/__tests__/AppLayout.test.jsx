import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import useAuthStore from '../store/authStore';

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<div>DashOK</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppLayout sidebar por rol', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: 'tkn',
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it('muestra solo items permitidos para PRODUCCION', () => {
    useAuthStore.setState({ user: { username: 'p', role: 'PRODUCCION' } });
    renderLayout();
    expect(screen.getByRole('link', { name: 'Inicio' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Producción' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Alertas' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Catálogo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Recepción' })).not.toBeInTheDocument();
  });

  it('muestra todos los items para ADMIN', () => {
    useAuthStore.setState({ user: { username: 'a', role: 'ADMIN' } });
    renderLayout();
    ['Inicio', 'Catálogo', 'Inventario', 'Recepción', 'Producción', 'Alertas'].forEach((label) => {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    });
  });
});
