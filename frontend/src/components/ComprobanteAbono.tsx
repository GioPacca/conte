import type { Abono } from '../api/eventos';
import { formatearMonto, formatearFecha } from '../lib/formato';
import { descargarComprobanteImagen } from '../lib/comprobanteImagen';

// Comprobante de abono de evento (decisión 5: NO se almacena).
// Contenido según especificación: miembro, responsable (o "Sin responsable
// asociado"), evento, fecha de pago, monto, observación.

function textoResponsable(abono: Abono): string {
  const r = abono.participante.miembro.responsable;
  return r ? `${r.nombre} ${r.apellido}` : 'Sin responsable asociado';
}

function descargar(abono: Abono) {
  const m = abono.participante.miembro;
  descargarComprobanteImagen({
    subtitulo: 'Comprobante de abono de evento',
    filas: [
      ['Miembro', `${m.nombre} ${m.apellido} — DNI ${m.dni}`],
      ['Responsable', textoResponsable(abono)],
      ['Evento', abono.participante.evento.nombre],
      ['Fecha de pago', formatearFecha(abono.fechaPago)],
    ],
    monto: abono.monto,
    observaciones: abono.observaciones,
    nombreArchivo: `comprobante-abono-${m.apellido.replace(/\s+/g, '-')}-${abono.participante.evento.nombre.replace(/\s+/g, '-')}`,
  });
}

// Tarjeta de comprobante en pantalla, con botón de descarga.
export function ComprobanteAbono({ abono }: { abono: Abono }) {
  const m = abono.participante.miembro;
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-3 bg-emerald-700 px-4 py-2 text-white">
        <span className="font-bold">CONTE</span>
        <span className="text-xs text-emerald-100">Comprobante de abono de evento</span>
      </div>
      <dl className="grid grid-cols-1 gap-2 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">Miembro</dt>
          <dd>{m.nombre} {m.apellido} — DNI {m.dni}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">Responsable</dt>
          <dd>{textoResponsable(abono)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">Evento</dt>
          <dd>{abono.participante.evento.nombre}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">Fecha de pago</dt>
          <dd>{formatearFecha(abono.fechaPago)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">Monto</dt>
          <dd className="text-xl font-bold text-emerald-700">{formatearMonto(abono.monto)}</dd>
        </div>
        {abono.observaciones && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase text-gray-500">Observaciones</dt>
            <dd>{abono.observaciones}</dd>
          </div>
        )}
      </dl>
      <div className="border-t border-gray-100 px-4 py-3">
        <button
          type="button"
          onClick={() => descargar(abono)}
          className="rounded bg-emerald-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Descargar imagen
        </button>
      </div>
    </div>
  );
}
