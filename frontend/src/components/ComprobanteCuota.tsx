import type { Pago } from '../api/pagos';
import { nombreMes, formatearMonto, formatearFecha } from '../lib/formato';
import { descargarComprobanteImagen } from '../lib/comprobanteImagen';

// Comprobante de pago de cuota de actividad (decisión 5: NO se almacena;
// se muestra tras registrar y se descarga como imagen PNG).
// Contenido según especificación: miembro, responsable (o "Sin responsable
// asociado"), fecha de pago, mes y año, monto, observación.

function textoResponsable(pago: Pago): string {
  return pago.miembro.responsable
    ? `${pago.miembro.responsable.nombre} ${pago.miembro.responsable.apellido}`
    : 'Sin responsable asociado';
}

function descargar(pago: Pago) {
  descargarComprobanteImagen({
    subtitulo: 'Comprobante de pago de cuota de actividad',
    filas: [
      ['Miembro', `${pago.miembro.nombre} ${pago.miembro.apellido} — DNI ${pago.miembro.dni}`],
      ['Responsable', textoResponsable(pago)],
      ['Período', `${nombreMes(pago.mes)} ${pago.anio}`],
      ['Fecha de pago', formatearFecha(pago.fechaPago)],
    ],
    monto: pago.monto,
    observaciones: pago.observaciones,
    nombreArchivo: `comprobante-cuota-${pago.miembro.apellido.replace(/\s+/g, '-')}-${nombreMes(pago.mes)}-${pago.anio}`,
  });
}

// Tarjeta de comprobante en pantalla, con botón de descarga.
export function ComprobanteCuota({ pago }: { pago: Pago }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-3 bg-emerald-700 px-4 py-2 text-white">
        <span className="font-bold">CONTE</span>
        <span className="text-xs text-emerald-100">
          Comprobante de pago de cuota de actividad
        </span>
      </div>
      <dl className="grid grid-cols-1 gap-2 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">Miembro</dt>
          <dd>{pago.miembro.nombre} {pago.miembro.apellido} — DNI {pago.miembro.dni}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">Responsable</dt>
          <dd>{textoResponsable(pago)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">Período</dt>
          <dd>{nombreMes(pago.mes)} {pago.anio}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">Fecha de pago</dt>
          <dd>{formatearFecha(pago.fechaPago)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">Monto</dt>
          <dd className="text-xl font-bold text-emerald-700">{formatearMonto(pago.monto)}</dd>
        </div>
        {pago.observaciones && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase text-gray-500">Observaciones</dt>
            <dd>{pago.observaciones}</dd>
          </div>
        )}
      </dl>
      <div className="border-t border-gray-100 px-4 py-3">
        <button
          type="button"
          onClick={() => descargar(pago)}
          className="rounded bg-emerald-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Descargar imagen
        </button>
      </div>
    </div>
  );
}
