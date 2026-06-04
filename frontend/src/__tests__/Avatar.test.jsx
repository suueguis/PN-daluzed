import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Avatar from '../components/ui/Avatar';
import { getInitials } from '../utils/getInitials';

describe('getInitials', () => {
  it('toma las dos primeras letras del local-part del email cuando no hay separador', () => {
    expect(getInitials('samuel@daluzed.com')).toBe('SA');
  });

  it('combina primera letra de dos partes separadas por punto', () => {
    expect(getInitials('samuel.tabares@daluzed.com')).toBe('ST');
  });

  it('soporta separadores _, - y +', () => {
    expect(getInitials('juan_perez@daluzed.com')).toBe('JP');
    expect(getInitials('maria-jose@daluzed.com')).toBe('MJ');
    expect(getInitials('lina+work@daluzed.com')).toBe('LW');
  });

  it('devuelve "?" cuando el valor está vacío o es inválido', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials(null)).toBe('?');
    expect(getInitials(undefined)).toBe('?');
    expect(getInitials(42)).toBe('?');
  });

  it('funciona también con strings que no son email', () => {
    expect(getInitials('Samuel Tabares')).toBe('ST');
    expect(getInitials('admin')).toBe('AD');
  });
});

describe('Avatar', () => {
  it('renderiza las iniciales y aplica el color del rol ADMIN', () => {
    render(<Avatar name="ada.admin@daluzed.com" role="ADMIN" />);
    const node = screen.getByTestId('user-avatar');
    expect(node).toHaveTextContent('AA');
    expect(node).toHaveAttribute('data-role', 'ADMIN');
    expect(node.className).toMatch(/bg-cherry-500/);
  });

  it('aplica el color de GERENTE', () => {
    render(<Avatar name="gerente@daluzed.com" role="GERENTE" />);
    expect(screen.getByTestId('user-avatar').className).toMatch(/bg-peach-300/);
  });

  it('aplica el color de PRODUCCION', () => {
    render(<Avatar name="prod@daluzed.com" role="PRODUCCION" />);
    expect(screen.getByTestId('user-avatar').className).toMatch(/bg-butter-200/);
  });

  it('aplica el color de INVENTARIO', () => {
    render(<Avatar name="inv@daluzed.com" role="INVENTARIO" />);
    expect(screen.getByTestId('user-avatar').className).toMatch(/bg-mint-200/);
  });

  it('usa un fallback neutro cuando no hay rol conocido', () => {
    render(<Avatar name="x@y.com" role="DESCONOCIDO" />);
    expect(screen.getByTestId('user-avatar').className).toMatch(/bg-cream-100/);
  });

  it('aplica la clase de tamaño correspondiente', () => {
    render(<Avatar name="x@y.com" role="ADMIN" size="lg" />);
    expect(screen.getByTestId('user-avatar').className).toMatch(/h-20/);
  });

  it('expone un aria-label accesible', () => {
    render(<Avatar name="sam@daluzed.com" role="ADMIN" />);
    expect(screen.getByLabelText(/avatar de sam@daluzed.com/i)).toBeInTheDocument();
  });
});
