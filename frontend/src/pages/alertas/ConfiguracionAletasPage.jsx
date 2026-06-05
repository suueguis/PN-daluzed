import { useState } from 'react';
import { useConfiguracionAlerta, useActualizarConfiguracion } from '../../hooks/alertas/useAlertas';

function ConfiguracionForm({ config, actualizar, isPending }) {
  const [formData, setFormData] = useState({
    whatsapp_numero: config.whatsapp_numero || '',
    email_gerencia: config.email_gerencia || '',
    email_produccion: config.email_produccion || '',
    dias_umbral_vencimiento: config.dias_umbral_vencimiento || 7,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'dias_umbral_vencimiento' ? parseInt(value) || 7 : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (config?.id) {
      actualizar({ id: config.id, data: formData });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-cream-100 p-4 rounded-lg">
      <div>
        <label htmlFor="whatsapp_numero" className="block text-sm font-medium text-wine-900 mb-1">
          Número de WhatsApp
        </label>
        <input
          id="whatsapp_numero"
          name="whatsapp_numero"
          type="text"
          placeholder="ej. +573001234567"
          value={formData.whatsapp_numero}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-wine-200 rounded-md text-sm placeholder:text-wine-700/40"
        />
        <p className="text-xs text-wine-700 mt-1">
          Incluir código de país. Si vacío, no se enviarán alertas por WhatsApp.
        </p>
      </div>

      <div>
        <label htmlFor="email_gerencia" className="block text-sm font-medium text-wine-900 mb-1">
          Email Gerencia
        </label>
        <input
          id="email_gerencia"
          name="email_gerencia"
          type="email"
          placeholder="gerencia@daluzed.com"
          value={formData.email_gerencia}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-wine-200 rounded-md text-sm placeholder:text-wine-700/40"
        />
      </div>

      <div>
        <label htmlFor="email_produccion" className="block text-sm font-medium text-wine-900 mb-1">
          Email Producción
        </label>
        <input
          id="email_produccion"
          name="email_produccion"
          type="email"
          placeholder="produccion@daluzed.com"
          value={formData.email_produccion}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-wine-200 rounded-md text-sm placeholder:text-wine-700/40"
        />
      </div>

      <div>
        <label htmlFor="dias_umbral_vencimiento" className="block text-sm font-medium text-wine-900 mb-1">
          Días antes de vencimiento para alerta
        </label>
        <input
          id="dias_umbral_vencimiento"
          name="dias_umbral_vencimiento"
          type="number"
          min="1"
          max="30"
          value={formData.dias_umbral_vencimiento}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-wine-200 rounded-md text-sm"
        />
        <p className="text-xs text-wine-700 mt-1">
          Los lotes que vencen dentro de estos días generarán una alerta.
        </p>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-cherry-500 text-white text-sm font-semibold rounded-md hover:bg-cherry-600 disabled:opacity-50"
        >
          {isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}

export default function ConfiguracionAletasPage() {
  const { data: config, isLoading } = useConfiguracionAlerta();
  const { mutate: actualizar, isPending } = useActualizarConfiguracion();

  if (isLoading || !config) {
    return <div className="text-sm text-wine-700">Cargando configuración...</div>;
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold text-wine-700 mb-4">
        Configuración de Canales de Alerta
      </h2>
      <ConfiguracionForm key={config.id} config={config} actualizar={actualizar} isPending={isPending} />
    </div>
  );
}
