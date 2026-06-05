import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

import ConfiguracionAletasPage from '../../../pages/alertas/ConfiguracionAletasPage';
import * as alertasHooks from '../../../hooks/alertas/useAlertas';

vi.mock('../../../hooks/alertas/useAlertas', async () => {
  const actual = await vi.importActual('../../../hooks/alertas/useAlertas');
  return {
    ...actual,
    useConfiguracionAlerta: vi.fn(),
    useActualizarConfiguracion: vi.fn(),
  };
});

const queryClient = new QueryClient();

const renderComponent = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ConfiguracionAletasPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ConfiguracionAletasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('muestra título y descripción', () => {
    vi.mocked(alertasHooks.useConfiguracionAlerta).mockReturnValue({
      data: {
        id: 1,
        whatsapp_numero: '+573001234567',
        email_gerencia: 'gerencia@daluzed.com',
        email_produccion: 'produccion@daluzed.com',
        dias_umbral_vencimiento: 7,
      },
      isLoading: false,
    });

    vi.mocked(alertasHooks.useActualizarConfiguracion).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    renderComponent();

    expect(screen.getByText('Configuración de Canales de Alerta')).toBeInTheDocument();
  });

  test('muestra los campos del formulario precargados', () => {
    const mockConfig = {
      id: 1,
      whatsapp_numero: '+573001234567',
      email_gerencia: 'gerencia@daluzed.com',
      email_produccion: 'produccion@daluzed.com',
      dias_umbral_vencimiento: 10,
    };

    vi.mocked(alertasHooks.useConfiguracionAlerta).mockReturnValue({
      data: mockConfig,
      isLoading: false,
    });

    vi.mocked(alertasHooks.useActualizarConfiguracion).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    renderComponent();

    expect(screen.getByDisplayValue('+573001234567')).toBeInTheDocument();
    expect(screen.getByDisplayValue('gerencia@daluzed.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('produccion@daluzed.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
  });

  test('actualiza los datos al cambiar inputs', () => {
    vi.mocked(alertasHooks.useConfiguracionAlerta).mockReturnValue({
      data: {
        id: 1,
        whatsapp_numero: '+573001234567',
        email_gerencia: 'old@daluzed.com',
        email_produccion: 'produccion@daluzed.com',
        dias_umbral_vencimiento: 7,
      },
      isLoading: false,
    });

    vi.mocked(alertasHooks.useActualizarConfiguracion).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    renderComponent();

    const emailInput = screen.getByDisplayValue('old@daluzed.com');
    fireEvent.change(emailInput, { target: { value: 'new@daluzed.com' } });

    expect(emailInput.value).toBe('new@daluzed.com');
  });

  test('llama a actualizar al enviar el formulario', async () => {
    const mockMutate = vi.fn();

    vi.mocked(alertasHooks.useConfiguracionAlerta).mockReturnValue({
      data: {
        id: 1,
        whatsapp_numero: '+573001234567',
        email_gerencia: 'gerencia@daluzed.com',
        email_produccion: 'produccion@daluzed.com',
        dias_umbral_vencimiento: 7,
      },
      isLoading: false,
    });

    vi.mocked(alertasHooks.useActualizarConfiguracion).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    renderComponent();

    const submitButton = screen.getByText('Guardar cambios');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });

    const callArgs = mockMutate.mock.calls[0][0];
    expect(callArgs.id).toBe(1);
    expect(callArgs.data.email_gerencia).toBe('gerencia@daluzed.com');
  });

  test('muestra estado de carga al actualizar', () => {
    vi.mocked(alertasHooks.useConfiguracionAlerta).mockReturnValue({
      data: {
        id: 1,
        whatsapp_numero: '+573001234567',
        email_gerencia: 'gerencia@daluzed.com',
        email_produccion: 'produccion@daluzed.com',
        dias_umbral_vencimiento: 7,
      },
      isLoading: false,
    });

    vi.mocked(alertasHooks.useActualizarConfiguracion).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
    });

    renderComponent();

    const submitButton = screen.getByText('Guardando...');
    expect(submitButton).toBeDisabled();
  });
});
