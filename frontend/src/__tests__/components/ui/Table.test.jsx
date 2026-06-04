import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Table from '../../../components/ui/Table';

const columns = [
  { key: 'id',     header: 'ID' },
  { key: 'name',   header: 'Nombre' },
];

describe('Table', () => {
  it('muestra empty state cuando no hay datos', () => {
    render(<Table columns={columns} data={[]} emptyTitle="Vacío" />);
    expect(screen.getByText('Vacío')).toBeInTheDocument();
  });

  it('renderiza filas y pagina', async () => {
    const data = Array.from({ length: 15 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
    render(<Table columns={columns} data={data} pageSize={10} />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.queryByText('Item 11')).not.toBeInTheDocument();
    expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(screen.getByText('Item 11')).toBeInTheDocument();
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
  });
});
