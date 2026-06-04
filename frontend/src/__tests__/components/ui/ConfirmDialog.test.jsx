import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('muestra primero la advertencia y luego pide tipear la palabra clave', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        onClose={() => {}}
        onConfirm={onConfirm}
        title="Eliminar bodega"
        description="Esta bodega y sus zonas quedarán eliminadas."
        confirmWord="BOD-01"
      />,
    );

    expect(screen.getByText(/quedarán eliminadas/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /continuar/i }));

    expect(screen.getByLabelText('Confirmación')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('mantiene el botón Confirmar deshabilitado hasta que se escribe la palabra exacta', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        onClose={() => {}}
        onConfirm={onConfirm}
        confirmWord="admin@daluzed.com"
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /continuar/i }));

    const confirmBtn = screen.getByRole('button', { name: /confirmar/i });
    expect(confirmBtn).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Confirmación'), 'admin@daluzed');
    expect(confirmBtn).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Confirmación'), '.com');
    expect(confirmBtn).toBeEnabled();

    await userEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cuando no se pasa confirmWord confirma directamente desde la advertencia', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog open onClose={() => {}} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole('button', { name: /continuar/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('Cancelar invoca onClose sin confirmar', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog open onClose={onClose} onConfirm={onConfirm} confirmWord="X" />,
    );

    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
