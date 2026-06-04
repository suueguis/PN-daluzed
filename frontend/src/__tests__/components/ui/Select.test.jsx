import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Select from '../../../components/ui/Select';

describe('Select', () => {
  const OPTIONS = [
    { value: '1', label: 'Uno' },
    { value: '2', label: 'Dos' },
  ];

  it('renderiza el placeholder como opción deshabilitada al frente', () => {
    render(<Select options={OPTIONS} placeholder="Selecciona algo…" defaultValue="" />);
    const placeholder = screen.getByRole('option', { name: 'Selecciona algo…' });
    expect(placeholder).toBeDisabled();
    expect(placeholder).toHaveValue('');
  });

  it('lista las opciones reales después del placeholder', () => {
    render(<Select options={OPTIONS} placeholder="Selecciona…" defaultValue="" />);
    expect(screen.getByRole('option', { name: 'Uno' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Dos' })).toBeInTheDocument();
  });

  it('omite el option placeholder cuando no se provee', () => {
    render(<Select options={OPTIONS} />);
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });
});
