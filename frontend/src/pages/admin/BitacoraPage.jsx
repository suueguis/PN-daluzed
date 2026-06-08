import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditoriaAPI } from '../../api/auditoriaAPI';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const ACCIONES = [
  '', 'LOGIN', 'LOGOUT', 'RECEPCION_CREADA', 'TRASLADO',
  'BATIDO_CREADO', 'COMPENSATORIO', 'DESPACHO', 'USUARIO_DESACTIVADO',
];

const ACCION_TONE = {
  LOGIN:               'success',
  LOGOUT:              'neutral',
  RECEPCION_CREADA:    'info',
  TRASLADO:            'warning',
  BATIDO_CREADO:       'info',
  COMPENSATORIO:       'warning',
  DESPACHO:            'success',
  USUARIO_DESACTIVADO: 'danger',
};

const ACCION_LABEL = {
  LOGIN:               'Inicio de sesión',
  LOGOUT:              'Cierre de sesión',
  RECEPCION_CREADA:    'Recepción registrada',
  TRASLADO:            'Traslado de lote',
  BATIDO_CREADO:       'Batido registrado',
  COMPENSATORIO:       'Movimiento compensatorio',
  DESPACHO:            'Despacho a punto de venta',
  USUARIO_DESACTIVADO: 'Usuario desactivado',
};

const KEY_LABEL = {
  email:                'Correo',
  recepcion_id:         'Recepción #',
  oc_id:                'OC #',
  movimiento_id:        'Mov. #',
  lote_id:              'Lote #',
  batido_id:            'Batido #',
  producto:             'Producto',
  compensatorio_id:     'Comp. #',
  tipo_afectado:        'Tipo',
  lote_pt_id:           'Lote PT #',
  usuario_desactivado:  'Usuario',
};

function formatDetalle(accion, detalle) {
  if (!detalle || typeof detalle !== 'object') return '—';
  const parts = Object.entries(detalle)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => {
      const label = KEY_LABEL[k];
      if (!label) return null;
      return `${label}${v}`;
    })
    .filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
}

export default function BitacoraPage() {
  const [accion, setAccion]   = useState('');
  const [desde, setDesde]     = useState('');
  const [hasta, setHasta]     = useState('');
  const [params, setParams]   = useState({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ['bitacora', params],
    queryFn: () => auditoriaAPI.bitacora(params),
  });

  const entradas = data?.bitacora ?? [];

  function handleConsultar() {
    const p = {};
    if (accion) p.accion = accion;
    if (desde)  p.desde  = desde;
    if (hasta)  p.hasta  = hasta;
    setParams(p);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-crushed text-2xl text-wine-900">Bitácora de operaciones</h1>
        <p className="text-sm text-wine-700">Registro de acciones críticas del sistema.</p>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-peach-200 bg-cream-50 p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="bit-accion" className="text-xs font-semibold text-wine-700">Acción</label>
          <select
            id="bit-accion"
            value={accion}
            onChange={(e) => setAccion(e.target.value)}
            className="rounded-xl border border-peach-300 bg-white px-3 py-2 text-sm text-wine-900 focus:outline-none focus:ring-2 focus:ring-rose-300"
          >
            {ACCIONES.map((a) => (
              <option key={a} value={a}>{a ? (ACCION_LABEL[a] ?? a) : 'Todas las acciones'}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="bit-desde" className="text-xs font-semibold text-wine-700">Desde</label>
          <input
            id="bit-desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded-xl border border-peach-300 bg-white px-3 py-2 text-sm text-wine-900 focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="bit-hasta" className="text-xs font-semibold text-wine-700">Hasta</label>
          <input
            id="bit-hasta"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="rounded-xl border border-peach-300 bg-white px-3 py-2 text-sm text-wine-900 focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
        <Button onClick={handleConsultar}>Consultar</Button>
      </div>

      {/* Tabla */}
      {isLoading && <div className="flex justify-center py-10"><Spinner /></div>}
      {!isLoading && isError && (
        <p className="rounded-2xl border border-peach-200 bg-cream-50 px-5 py-4 text-sm text-wine-700">
          No se pudo cargar la bitácora.
        </p>
      )}
      {!isLoading && !isError && entradas.length === 0 && (
        <p className="rounded-2xl border border-peach-200 bg-cream-50 px-5 py-4 text-sm text-wine-700">
          Sin entradas en el rango seleccionado.
        </p>
      )}
      {!isLoading && !isError && entradas.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-peach-200 bg-white">
          <table className="w-full text-sm" aria-label="Bitácora de operaciones">
            <thead className="bg-cream-100">
              <tr>
                {['Fecha', 'Acción', 'Usuario', 'IP', 'Detalle'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-wine-700"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entradas.map((e) => (
                <tr key={e.id} className="border-t border-peach-200/60 hover:bg-cream-50">
                  <td className="px-4 py-2 tabular-nums text-wine-900 whitespace-nowrap">
                    {new Date(e.fecha).toLocaleString('es-CO')}
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={ACCION_TONE[e.accion] ?? 'neutral'}>
                      {ACCION_LABEL[e.accion] ?? e.accion}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-wine-900">{e.usuario ?? '—'}</td>
                  <td className="px-4 py-2 tabular-nums text-wine-700">{e.ip ?? '—'}</td>
                  <td className="px-4 py-2 text-wine-700 text-xs max-w-xs">
                    {formatDetalle(e.accion, e.detalle)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-wine-700/60">
            Mostrando {entradas.length} entradas{entradas.length === 500 && ' (máx. 500)'}.
          </p>
        </div>
      )}
    </div>
  );
}
