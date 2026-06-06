import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { materiasPrimasAPI } from '../api/catalogoAPI';
import { alertasAPI } from '../api/alertasAPI';
import { produccionAPI } from '../api/produccionAPI';
import { kpisAPI, exportarAPI, indicadoresAPI } from '../api/indicadoresAPI';
import useAuthStore from '../store/authStore';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import { formatDate, formatDecimal } from '../utils/formatters';

const ROLE_LABEL = {
  ADMIN:      'Admin',
  GERENTE:    'Gerente',
  PRODUCCION: 'Producción',
  INVENTARIO: 'Inventario',
};

function countOf(data) {
  if (data == null) return null;
  if (typeof data.count === 'number') return data.count;
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data?.results)) return data.results.length;
  return null;
}

const today = new Date().toISOString().slice(0, 10);

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const displayName = ROLE_LABEL[user?.role] ?? 'invitado';
  const [exportando, setExportando] = useState(false);
  const [exportDesde, setExportDesde] = useState('');
  const [exportHasta, setExportHasta] = useState('');

  // ── KPIs con refresh cada 60 s ────────────────────────────────────
  const { data: mpsData, isLoading: mpsLoading } = useQuery({
    queryKey: ['dashboard', 'mps'],
    queryFn: () => materiasPrimasAPI.list(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: alertasData, isLoading: alertasLoading } = useQuery({
    queryKey: ['dashboard', 'alertas'],
    queryFn: alertasAPI.activas,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: batidosData, isLoading: batidosLoading } = useQuery({
    queryKey: ['dashboard', 'batidos', today],
    queryFn: () => produccionAPI.listBatidos({ fecha: today }).then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: stockData, isLoading: stockLoading } = useQuery({
    queryKey: ['dashboard', 'kpis', 'stock'],
    queryFn: async () => { const { data } = await kpisAPI.stock(); return data; },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: vencData, isLoading: vencLoading } = useQuery({
    queryKey: ['dashboard', 'kpis', 'vencimientos'],
    queryFn: async () => { const { data } = await kpisAPI.vencimientos(7); return data; },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: utilizacionData, isLoading: utilizacionLoading } = useQuery({
    queryKey: ['dashboard', 'utilizacion-bodega'],
    queryFn: indicadoresAPI.utilizacionBodega,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: resumenData, isLoading: resumenLoading } = useQuery({
    queryKey: ['dashboard', 'resumen'],
    queryFn: indicadoresAPI.resumen,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  // ── Derived metrics ───────────────────────────────────────────────
  const stockBP = stockData?.stock_por_bodega?.filter((r) => r.bodega_tipo === 'PRINCIPAL') ?? [];
  const totalStockBP = stockBP.reduce((s, r) => s + parseFloat(r.cantidad_total), 0);
  const lotesVencer = vencData?.lotes_por_vencer ?? [];

  const canSeeCharts = ['ADMIN', 'GERENTE'].includes(user?.role);

  const batidosPorDia = useMemo(() => {
    const list = Array.isArray(batidosData) ? batidosData : (batidosData?.results ?? []);
    const todayDate = new Date();
    const monday = new Date(todayDate);
    monday.setDate(todayDate.getDate() - ((todayDate.getDay() + 6) % 7));
    return ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map((dia, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      return { dia, batidos: list.filter((b) => b.fecha_produccion === iso).length };
    });
  }, [batidosData]);

  const CAT_LABEL = { GALLETERIA: 'Galletería', TORTA: 'Torta', BIZCOCHO: 'Bizcocho', GENERAL: 'General' };
  const stockPorCategoria = useMemo(() => {
    const mpsArr = Array.isArray(mpsData) ? mpsData : (mpsData?.results ?? []);
    const catMap = Object.fromEntries(mpsArr.map((m) => [m.nombre, m.categoria ?? 'GENERAL']));
    const totales = {};
    for (const row of stockBP) {
      const cat = catMap[row.materia_prima] ?? 'GENERAL';
      totales[cat] = (totales[cat] ?? 0) + parseFloat(row.cantidad_total);
    }
    return Object.entries(totales).map(([cat, total]) => ({
      categoria: CAT_LABEL[cat] ?? cat,
      stock: Math.round(total),
    }));
  }, [stockBP, mpsData]);

  const rotacion = resumenData?.rotacion_inventario ?? null;
  const periodoRotacion = resumenData?.periodo_rotacion ?? '';
  const ocPendientes = resumenData?.oc_pendientes ?? null;

  const cards = [
    {
      key:   'mp',
      label: 'Materias primas',
      value: mpsLoading     ? '…' : (countOf(mpsData)     ?? '—'),
      hint:  'registradas en catálogo',
      link:  '/catalogo/materias-primas',
      tone:  'bg-cream-100 border-peach-200',
    },
    {
      key:   'alertas',
      label: 'Alertas activas',
      value: alertasLoading ? '…' : (countOf(alertasData) ?? '—'),
      hint:  'requieren atención',
      link:  '/alertas',
      tone:  'bg-butter-200/60 border-butter-200',
    },
    {
      key:   'batidos',
      label: 'Batidos del día',
      value: batidosLoading ? '…' : (countOf(batidosData) ?? '—'),
      hint:  today,
      link:  '/produccion',
      tone:  'bg-mint-200/50 border-mint-200',
    },
    {
      key:   'stock-bp',
      label: 'Stock Bodega Principal',
      value: stockLoading ? '…' : formatDecimal(totalStockBP, 0),
      hint:  'gramos / unidades totales',
      link:  '/inventario/lotes',
      tone:  'bg-rose-100/60 border-rose-200',
    },
    {
      key:   'rotacion',
      label: 'Rotación inventario',
      value: resumenLoading ? '…' : (rotacion !== null ? rotacion.toFixed(2) : '—'),
      hint:  periodoRotacion || 'último mes',
      link:  '/inventario/lotes',
      tone:  'bg-peach-100/60 border-peach-200',
    },
    {
      key:   'oc-pendientes',
      label: 'OC pendientes',
      value: resumenLoading ? '…' : (ocPendientes ?? '—'),
      hint:  'órdenes sin recibir completamente',
      link:  '/recepcion/ordenes',
      tone:  'bg-wine-100/40 border-wine-200',
    },
  ];

  async function handleExportar(formato) {
    setExportando(true);
    try {
      const { data: blob } = await exportarAPI.descargar(formato, exportDesde || undefined, exportHasta || undefined);
      const ext = formato === 'pdf' ? 'pdf' : 'xlsx';
      triggerDownload(blob, `inventario_${today}.${ext}`);
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-crushed text-4xl text-wine-900">
          Hola, {displayName}
        </h1>
        <p className="mt-1 text-wine-700">
          Bienvenido al panel de Daluzed. Aquí verás un resumen rápido del estado de la operación.
        </p>
      </header>

      {/* ── Tarjetas resumen ─────────────────────────────────────── */}
      <section
        aria-label="Resumen rápido"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {cards.map((card) => (
          <Link
            key={card.key}
            to={card.link}
            data-testid={`stub-card-${card.key}`}
            className={`rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md ${card.tone}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-wine-700/80">
              {card.label}
            </p>
            <p className="mt-2 font-crushed text-3xl text-wine-900">{card.value}</p>
            <p className="mt-2 text-xs text-wine-700/80">{card.hint}</p>
          </Link>
        ))}
      </section>

      {/* ── Gráficas — solo ADMIN / GERENTE ─────────────────────── */}
      {canSeeCharts && (
        <section aria-label="Gráficas de actividad">
          <h2 className="mb-3 font-crushed text-xl text-wine-900">Actividad de la semana</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Batidos por día */}
            <div className="rounded-2xl border border-peach-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-wine-900">Batidos por día</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={batidosPorDia} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E0D0" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#7A4030' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#7A4030' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '10px', borderColor: '#EDD8C4', fontSize: 12 }}
                    formatter={(v) => [v, 'Batidos']}
                  />
                  <Line
                    type="monotone"
                    dataKey="batidos"
                    stroke="#C96870"
                    strokeWidth={2}
                    dot={{ fill: '#C96870', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Stock BP por categoría */}
            <div className="rounded-2xl border border-peach-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-wine-900">Stock Bodega Principal por categoría</h3>
              {stockPorCategoria.length === 0 ? (
                <p className="py-8 text-center text-sm text-wine-700/60">Sin datos de stock.</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={stockPorCategoria} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0E0D0" />
                    <XAxis dataKey="categoria" tick={{ fontSize: 11, fill: '#7A4030' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#7A4030' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '10px', borderColor: '#EDD8C4', fontSize: 12 }}
                      formatter={(v) => [formatDecimal(v), 'Stock']}
                    />
                    <Bar dataKey="stock" fill="#D4A882" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Lotes próximos a vencer ──────────────────────────────── */}
      <section aria-label="Lotes próximos a vencer">
        <h2 className="mb-3 font-crushed text-xl text-wine-900">
          Lotes próximos a vencer <span className="text-sm font-normal text-wine-700">(próximos 7 días)</span>
        </h2>
        {vencLoading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : lotesVencer.length === 0 ? (
          <p className="rounded-2xl border border-peach-200 bg-cream-50 px-5 py-4 text-sm text-wine-700">
            No hay lotes próximos a vencer.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-peach-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-cream-100">
                <tr>
                  {['Materia Prima', 'Bodega', 'Cantidad', 'Vencimiento', 'Días restantes'].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-wine-700">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lotesVencer.slice(0, 5).map((lote) => (
                  <tr key={lote.lote_id} className="border-t border-peach-200/60 hover:bg-cream-50">
                    <td className="px-4 py-3 text-wine-900">{lote.materia_prima}</td>
                    <td className="px-4 py-3 text-wine-900">{lote.bodega}</td>
                    <td className="px-4 py-3 tabular-nums text-wine-900">{formatDecimal(lote.cantidad)}</td>
                    <td className="px-4 py-3 tabular-nums text-wine-900">{formatDate(lote.fecha_vencimiento)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={lote.dias_restantes <= 3 ? 'danger' : 'warning'}>
                        {lote.dias_restantes}d
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Utilización de bodega por zona ─────────────────────────────── */}
      <section aria-label="Utilización de bodega por zona">
        <h2 className="mb-3 font-crushed text-xl text-wine-900">Utilización de bodegas</h2>
        {utilizacionLoading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-peach-200 bg-white p-4">
            {utilizacionData?.utilizacion_por_zona?.length > 0 ? (
              utilizacionData.utilizacion_por_zona.map((zona) => (
                <div key={zona.zona_id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-wine-900">{zona.zona_nombre}</p>
                      <p className="text-xs text-wine-700">{zona.bodega_nombre}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono text-wine-900">{formatDecimal(zona.stock_actual)} / {formatDecimal(zona.capacidad_maxima)}</p>
                      <p className="text-xs font-semibold text-wine-700">{zona.porcentaje_utilizacion.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`Utilización de ${zona.zona_nombre}`}
                    aria-valuenow={Math.round(zona.porcentaje_utilizacion)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-2 w-full overflow-hidden rounded-full bg-wine-200"
                  >
                    <div
                      style={{ width: `${Math.min(zona.porcentaje_utilizacion, 100)}%` }}
                      className={`h-full ${
                        zona.porcentaje_utilizacion >= 80
                          ? 'bg-cherry-500'
                          : zona.porcentaje_utilizacion >= 60
                          ? 'bg-rose-500'
                          : 'bg-mint-400'
                      }`}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-wine-700">Sin datos de utilización.</p>
            )}
          </div>
        )}
      </section>

      {/* ── Exportar reporte ─────────────────────────────────────── */}
      <section aria-label="Exportar reporte">
        <h2 className="mb-3 font-crushed text-xl text-wine-900">Exportar inventario</h2>
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-peach-200 bg-cream-50 p-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="export-desde" className="text-xs font-semibold text-wine-700">Desde</label>
            <input
              id="export-desde"
              type="date"
              value={exportDesde}
              onChange={(e) => setExportDesde(e.target.value)}
              placeholder="ej. 2026-01-01"
              className="rounded-xl border border-peach-300 bg-white px-3 py-2 text-sm text-wine-900 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="export-hasta" className="text-xs font-semibold text-wine-700">Hasta</label>
            <input
              id="export-hasta"
              type="date"
              value={exportHasta}
              onChange={(e) => setExportHasta(e.target.value)}
              placeholder="ej. 2026-12-31"
              className="rounded-xl border border-peach-300 bg-white px-3 py-2 text-sm text-wine-900 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>
          <Button variant="secondary" disabled={exportando} onClick={() => handleExportar('xlsx')}>
            {exportando ? '…' : 'Excel'}
          </Button>
          <Button variant="secondary" disabled={exportando} onClick={() => handleExportar('pdf')}>
            {exportando ? '…' : 'PDF'}
          </Button>
        </div>
      </section>
    </div>
  );
}
