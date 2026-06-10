import { describe, it, expect } from 'vitest';
import { formatApiError } from '../../utils/formatApiError';

describe('formatApiError', () => {
  it('devuelve el detail de DRF cuando existe', () => {
    const err = { response: { status: 400, data: { detail: 'Lote agotado.' } } };
    expect(formatApiError(err)).toBe('Lote agotado.');
  });

  it('formatea errores de validación DRF como "campo: mensaje"', () => {
    const err = {
      response: { status: 400, data: { codigo: ['Ya existe.'] } },
    };
    expect(formatApiError(err)).toBe('codigo: Ya existe.');
  });

  it('soporta valores escalares además de arrays — campo con label mapeado', () => {
    const err = { response: { status: 400, data: { email: 'inválido' } } };
    // 'email' está en FIELD_LABELS → 'Correo electrónico'
    expect(formatApiError(err)).toBe('Correo electrónico: inválido');
  });

  it('mapea 401 a mensaje de sesión expirada', () => {
    const err = { response: { status: 401, data: { detail: 'whatever' } } };
    expect(formatApiError(err)).toBe('Sesión expirada. Vuelve a iniciar sesión.');
  });

  it('mapea 403 a mensaje de permisos', () => {
    const err = { response: { status: 403, data: { detail: 'forbidden' } } };
    expect(formatApiError(err)).toBe('No tienes permisos para realizar esta acción.');
  });

  it('mapea 404 a mensaje de no encontrado', () => {
    const err = { response: { status: 404, data: { detail: 'gone' } } };
    expect(formatApiError(err)).toBe('El recurso no fue encontrado.');
  });

  it('mapea 5xx a mensaje genérico de servidor', () => {
    const err = { response: { status: 500, data: 'boom' } };
    expect(formatApiError(err, 'No se pudo guardar')).toBe(
      'Error interno del servidor. Intenta de nuevo en unos momentos.',
    );
  });

  it('cuando no hay response indica falta de conexión', () => {
    const err = { message: 'Network Error' };
    expect(formatApiError(err, 'No se pudo crear')).toBe('No se pudo crear (sin conexión con el servidor)');
  });

  it('cae al fallback con response.data vacío', () => {
    const err = { response: { status: 400, data: {} } };
    expect(formatApiError(err, 'Algo falló')).toBe('Algo falló');
  });

  it('acepta data como string plano', () => {
    const err = { response: { status: 400, data: 'No hay stock' } };
    expect(formatApiError(err)).toBe('No hay stock');
  });
});
