import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import useAuthStore from '../store/authStore';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/secret"
          element={
            <ProtectedRoute>
              <div>Secret Content</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <div>Admin Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('redirige a /login si no hay token', () => {
    renderAt('/secret');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renderiza children cuando hay token', () => {
    useAuthStore.setState({
      accessToken: 'tkn',
      user: { username: 'sam', role: 'INVENTARIO' },
      isAuthenticated: true,
      isLoading: false,
    });
    renderAt('/secret');
    expect(screen.getByText('Secret Content')).toBeInTheDocument();
  });

  it('redirige a /dashboard si el rol no coincide', () => {
    useAuthStore.setState({
      accessToken: 'tkn',
      user: { username: 'sam', role: 'INVENTARIO' },
      isAuthenticated: true,
      isLoading: false,
    });
    renderAt('/admin');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
