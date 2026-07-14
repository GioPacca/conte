import { useEffect, useState } from 'react';
import { obtenerPanel, type Panel } from '../api/panel';
import { nombreMes, formatearMonto, formatearFecha } from '../lib/formato';

// Panel principal (pantalla 2): totales de miembros, cantidad por rol,
// recaudación del mes actual por cuota de actividad, últimos movimientos
// unificados (pagos de cuota + abonos de evento, decisión 7) y acceso
// rápido a registrar pago.
export function Inicio({ alRegistrarPago }: { alRegistrarPago: () => void }) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerPanel()
      .then(setPanel)
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar el panel'));
  }, []);

  if (error) {
    return <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  }
  if (!panel) {
    return <p className="text-sm text-gray-500">Cargando panel…</p>;
  }

  const tarjetas = [
    { titulo: 'Miembros activos', valor: String(panel.miembrosActivos) },
    { titulo: 'Total de miembros', valor: String(panel.totalMiembros) },
    {
      titulo: `Recaudación de ${nombreMes(panel.recaudacionMesActual.mes)} ${panel.recaudacionMesActual.anio} (cuota de actividad)`,
      valor: formatearMonto(panel.recaudacionMesActual.total),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tarjetas de totales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {tarjetas.map((t) => (
          <div key={t.titulo} className="rounded-lg bg-white p-5 shadow">
            <p className="text-sm text-gray-500">{t.titulo}</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{t.valor}</p>
          </div>
        ))}
      </div>

      {/* Cantidad por rol + acceso rápido */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-white p-5 shadow">
          <p className="text-sm font-medium text-gray-700">Miembros por rol</p>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <dd className="text-xl font-bold text-gray-800">{panel.cantidadPorRol.CONQUISTADOR}</dd>
              <dt className="text-xs text-gray-500">Conquistadores</dt>
            </div>
            <div>
              <dd className="text-xl font-bold text-gray-800">{panel.cantidadPorRol.LIDER}</dd>
              <dt className="text-xs text-gray-500">Líderes</dt>
            </div>
            <div>
              <dd className="text-xl font-bold text-gray-800">{panel.cantidadPorRol.DIRECTIVO}</dd>
              <dt className="text-xs text-gray-500">Directivos</dt>
            </div>
          </dl>
        </div>
        <div className="flex items-center justify-center rounded-lg bg-white p-5 shadow">
          <button
            type="button"
            onClick={alRegistrarPago}
            className="rounded bg-emerald-700 px-6 py-3 font-medium text-white hover:bg-emerald-800"
          >
            Registrar pago
          </button>
        </div>
      </div>

      {/* Últimos movimientos unificados */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-gray-800">Últimos movimientos</h2>
        {panel.movimientos.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Todavía no hay movimientos registrados.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="py-2 pr-4 font-medium">Tipo</th>
                  <th className="py-2 pr-4 font-medium">Miembro</th>
                  <th className="py-2 pr-4 font-medium">Detalle</th>
                  <th className="py-2 pr-4 font-medium">Monto</th>
                  <th className="py-2 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {panel.movimientos.map((m) => (
                  <tr key={`${m.tipo}-${m.id}`} className="border-b border-gray-100">
                    <td className="py-2 pr-4">
                      <span
                        className={
                          'rounded px-2 py-0.5 text-xs font-medium ' +
                          (m.tipo === 'CUOTA'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-sky-100 text-sky-800')
                        }
                      >
                        {m.tipo === 'CUOTA' ? 'Cuota de actividad' : 'Abono de evento'}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{m.miembro}</td>
                    <td className="py-2 pr-4">
                      {m.tipo === 'CUOTA'
                        ? `${nombreMes(m.detalle.mes!)} ${m.detalle.anio}`
                        : m.detalle.evento}
                    </td>
                    <td className="py-2 pr-4">{formatearMonto(m.monto)}</td>
                    <td className="py-2">{formatearFecha(m.fechaPago)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
