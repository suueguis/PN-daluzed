import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KeyValueEditor from '../components/ui/KeyValueEditor';

describe('KeyValueEditor', () => {
  it('emite un objeto con números coercidos', async () => {
    const onChange = vi.fn();
    render(<KeyValueEditor label="Datos" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Campo 1 — nombre'), 'cantidad');
    await userEvent.type(screen.getByLabelText('Campo 1 — valor'), '250');

    expect(onChange).toHaveBeenLastCalledWith({ cantidad: 250 });
  });

  it('mantiene strings cuando el valor no es numérico', async () => {
    const onChange = vi.fn();
    render(<KeyValueEditor label="Datos" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Campo 1 — nombre'), 'estado');
    await userEvent.type(screen.getByLabelText('Campo 1 — valor'), 'EN_ESPERA');

    expect(onChange).toHaveBeenLastCalledWith({ estado: 'EN_ESPERA' });
  });

  it('ignora filas con clave vacía', async () => {
    const onChange = vi.fn();
    render(<KeyValueEditor label="Datos" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Campo 1 — valor'), '999');

    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it('permite añadir y eliminar filas', async () => {
    const onChange = vi.fn();
    render(<KeyValueEditor label="Datos" onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /añadir campo/i }));
    expect(screen.getAllByTestId('kv-row')).toHaveLength(2);

    await userEvent.type(screen.getByLabelText('Campo 1 — nombre'), 'a');
    await userEvent.type(screen.getByLabelText('Campo 1 — valor'), '1');
    await userEvent.type(screen.getByLabelText('Campo 2 — nombre'), 'b');
    await userEvent.type(screen.getByLabelText('Campo 2 — valor'), '2');

    expect(onChange).toHaveBeenLastCalledWith({ a: 1, b: 2 });

    await userEvent.click(screen.getByLabelText('Eliminar campo 2'));
    expect(onChange).toHaveBeenLastCalledWith({ a: 1 });
  });

  it('renderiza preview del JSON construido', async () => {
    const Wrapper = () => {
      const [obj, setObj] = useState({});
      return <KeyValueEditor label="Datos" value={obj} onChange={setObj} />;
    };
    render(<Wrapper />);

    await userEvent.type(screen.getByLabelText('Campo 1 — nombre'), 'qty');
    await userEvent.type(screen.getByLabelText('Campo 1 — valor'), '12');

    expect(screen.getByTestId('kv-preview')).toHaveTextContent('{"qty":12}');
  });
});
