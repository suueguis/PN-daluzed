import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MateriaPrimaForm from '../../../pages/catalogo/MateriaPrimaForm';
import {
  emptyMpForm,
  mpFormToPayload,
  validateMpForm,
  mpRowToForm,
} from '../../../pages/catalogo/mpForm';

const unidades = [
  { id: 1, nombre: 'Gramo', simbolo: 'g' },
  { id: 2, nombre: 'Mililitro', simbolo: 'ml' },
];

describe('MateriaPrimaForm helpers', () => {
  it('valida nombre requerido', () => {
    expect(validateMpForm(emptyMpForm())).toMatch(/nombre/i);
  });

  it('valida unidad requerida', () => {
    expect(validateMpForm({ ...emptyMpForm(), nombre: 'Harina' })).toMatch(/unidad/i);
  });

  it('rechaza punto_reorden negativo', () => {
    const f = { ...emptyMpForm(), nombre: 'Harina', unidad_medida: '1', punto_reorden: '-1' };
    expect(validateMpForm(f)).toMatch(/reorden/i);
  });

  it('mpRowToForm convierte fila del API correctamente', () => {
    const row = {
      nombre: 'Harina',
      unidad_medida: 1,
      punto_reorden: '15.50',
      dias_minimos_vencimiento: 30,
      categoria: 'GALLETERIA',
      condicion_almacenamiento: 'AMBIENTE',
      activo: true,
    };
    expect(mpRowToForm(row)).toMatchObject({
      nombre: 'Harina',
      unidad_medida: 1,
      punto_reorden: '15.50',
      dias_minimos_vencimiento: '30',
      categoria: 'GALLETERIA',
      activo: true,
    });
  });

  it('mpFormToPayload normaliza tipos numéricos', () => {
    const payload = mpFormToPayload({
      ...emptyMpForm(),
      nombre: ' Harina ',
      unidad_medida: '2',
      punto_reorden: '10',
      dias_minimos_vencimiento: '',
      categoria: 'GENERAL',
      condicion_almacenamiento: 'REFRIGERACION',
      activo: true,
    });
    expect(payload).toEqual({
      nombre: 'Harina',
      unidad_medida: 2,
      punto_reorden: 10,
      dias_minimos_vencimiento: null,
      categoria: 'GENERAL',
      condicion_almacenamiento: 'REFRIGERACION',
      activo: true,
    });
  });
});

describe('MateriaPrimaForm UI', () => {
  it('renderiza campos y propaga cambios via onChange', async () => {
    const onChange = vi.fn();
    render(
      <MateriaPrimaForm value={emptyMpForm()} onChange={onChange} unidades={unidades} />,
    );

    expect(screen.getByLabelText(/Nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Unidad de medida/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Punto de reorden/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Categoría/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Condición de almacenamiento/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Nombre/i), 'A');
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)[0];
    expect(last.nombre).toBe('A');
  });
});
