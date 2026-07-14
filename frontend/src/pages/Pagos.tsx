import { useEffect, useState, type FormEvent } from 'react';
import { registrarPago, type Pago } from '../api/pagos';
import { listarMiembros, type Miembro } from '../api/miembros';
import {
  listarEventos,
  obtenerEvento,
  registrarAbono,
  type EventoEnLista,
  type EventoDetalle,
  type Abono,
} from '../api/eventos';
import { ComprobanteCuota } from '../components/ComprobanteCuota';
import { ComprobanteAbono } from '../components/ComprobanteAbono';
import { MESES, hoyISO, formatearMonto } from '../lib/formato';

// Pantalla de pagos con los dos flujos de la especificación (pantalla 6):
// registrar pago de cuota de actividad y registrar abono de evento.
// `anioPorDefecto` sale de la configuración (anio_actual, decisión 9).
export function Pagos({
  miembroPreseleccionado,
  anioPorDefecto,
}: {
  miembroPreseleccionado: string | null;
  anioPorDefecto: number;
}) {
  const [flujo, setFlujo] = useState<'cuota' | 'abono'>('cuota');

  const estiloPestania = (activa: boolean) =>
    'rounded-t px-4 py-2 text-sm font-medium ' +
    (activa ? 'bg-white text-emerald-800 shadow' : 'text-gray-500 hover:text-gray-700');

  return (
    <div>
      <div className="flex gap-1">
        <button type="button" onClick={() => setFlujo('cuota')} className={estiloPestania(flujo === 'cuota')}>
          Pago de cuota de actividad
        </button>
        <button type="button" onClick={() => setFlujo('abono')} className={estiloPestania(flujo === 'abono')}>
          Abono de evento
        </button>
      </div>
      {flujo === 'cuota' ? (
        <FlujoCuota
          miembroPreseleccionado={miembroPreseleccionado}
          anioPorDefecto={anioPorDefecto}
        />
      ) : (
        <FlujoAbono />
      )}
    </div>
  );
}

// ---------- Flujo 1: pago de cuota de actividad ----------
// Multi-mes: cada mes seleccionado genera UN registro con el mismo monto
// (todo o nada). Tras registrar se muestran los comprobantes, uno por mes.
function FlujoCuota({
  miembroPreseleccionado,
  anioPorDefecto,
}: {
  miembroPreseleccionado: string | null;
  anioPorDefecto: number;
}) {
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [miembroId, setMiembroId] = useState(miembroPreseleccionado ?? '');
  const [mesesSeleccionados, setMesesSeleccionados] = useState<number[]>([]);
  // El año por defecto sale de la configuración (anio_actual)
  const [anio, setAnio] = useState(anioPorDefecto);
  const [monto, setMonto] = useState('');
  const [fechaPago, setFechaPago] = useState(hoyISO());
  const [observaciones, setObservaciones] = useState('');
  const [comprobantes, setComprobantes] = useState<Pago[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    listarMiembros({})
      .then(setMiembros)
      .catch(() => setError('No se pudieron cargar los miembros'));
  }, []);

  function alternarMes(mes: number) {
    setMesesSeleccionados((prev) =>
      prev.includes(mes) ? prev.filter((m) => m !== mes) : [...prev, mes].sort((a, b) => a - b)
    );
  }

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!miembroId) {
      setError('Seleccioná un miembro');
      return;
    }
    if (mesesSeleccionados.length === 0) {
      setError('Seleccioná al menos un mes');
      return;
    }
    const montoNumero = Number(monto);
    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      setError('El monto debe ser mayor a cero');
      return;
    }
    setEnviando(true);
    try {
      const pagos = await registrarPago({
        miembroId,
        meses: mesesSeleccionados,
        anio,
        monto: montoNumero,
        fechaPago,
        observaciones: observaciones || undefined,
      });
      setComprobantes(pagos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pago');
    } finally {
      setEnviando(false);
    }
  }

  function nuevoPago() {
    setComprobantes(null);
    setMesesSeleccionados([]);
    setMonto('');
    setObservaciones('');
    setFechaPago(hoyISO());
  }

  // --- Vista comprobantes (tras registrar) ---
  if (comprobantes) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {comprobantes.length === 1
            ? 'Pago registrado correctamente. Este es el comprobante:'
            : `Se registraron ${comprobantes.length} pagos (uno por mes). Estos son los comprobantes:`}
        </div>
        {comprobantes.map((pago) => (
          <ComprobanteCuota key={pago.id} pago={pago} />
        ))}
        <button
          type="button"
          onClick={nuevoPago}
          className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Registrar otro pago
        </button>
      </div>
    );
  }

  const estiloCampo =
    'mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none';

  // --- Vista formulario ---
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-lg font-semibold text-gray-800">
        Registrar pago de cuota de actividad
      </h2>

      <form onSubmit={manejarEnvio} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          Miembro *
          <select value={miembroId} onChange={(e) => setMiembroId(e.target.value)} required className={estiloCampo}>
            <option value="">Seleccionar miembro…</option>
            {miembros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.apellido}, {m.nombre} — DNI {m.dni}
                {m.estado === 'INACTIVO' ? ' (inactivo)' : ''}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium text-gray-700">Mes/es *</legend>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {MESES.map((nombre, i) => {
              const mes = i + 1;
              const activo = mesesSeleccionados.includes(mes);
              return (
                <label
                  key={mes}
                  className={
                    'flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm ' +
                    (activo
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50')
                  }
                >
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={() => alternarMes(mes)}
                    className="accent-emerald-700"
                  />
                  {nombre}
                </label>
              );
            })}
          </div>
        </fieldset>

        <label className="block text-sm font-medium text-gray-700">
          Año *
          <input
            type="number"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            min={2000}
            max={2100}
            required
            className={estiloCampo}
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Monto por cada mes seleccionado *
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            min="0.01"
            step="0.01"
            required
            placeholder="0,00"
            className={estiloCampo}
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Fecha de pago *
          <input
            type="date"
            value={fechaPago}
            onChange={(e) => setFechaPago(e.target.value)}
            required
            className={estiloCampo}
          />
        </label>

        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          Observaciones
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            className={estiloCampo}
          />
        </label>

        {mesesSeleccionados.length > 1 && (
          <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:col-span-2">
            Se registrarán {mesesSeleccionados.length} pagos (uno por mes), cada uno por el
            monto completo indicado. Si algún mes ya tiene pago, no se registrará ninguno.
          </p>
        )}

        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</p>
        )}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={enviando}
            className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {enviando ? 'Registrando…' : 'Registrar pago'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Flujo 2: abono de evento ----------
// Solo eventos ACTIVOS; el miembro debe ser participante del evento.
function FlujoAbono() {
  const [eventos, setEventos] = useState<EventoEnLista[]>([]);
  const [eventoId, setEventoId] = useState('');
  const [detalleEvento, setDetalleEvento] = useState<EventoDetalle | null>(null);
  const [participanteId, setParticipanteId] = useState('');
  const [monto, setMonto] = useState('');
  const [fechaPago, setFechaPago] = useState(hoyISO());
  const [observaciones, setObservaciones] = useState('');
  const [comprobante, setComprobante] = useState<Abono | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    listarEventos()
      .then((todos) => setEventos(todos.filter((e) => e.estado === 'ACTIVO')))
      .catch(() => setError('No se pudieron cargar los eventos'));
  }, []);

  // Al elegir un evento se cargan sus participantes
  useEffect(() => {
    setParticipanteId('');
    if (!eventoId) {
      setDetalleEvento(null);
      return;
    }
    obtenerEvento(eventoId)
      .then(setDetalleEvento)
      .catch(() => setError('No se pudo cargar el evento'));
  }, [eventoId]);

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!participanteId) {
      setError('Seleccioná un miembro participante');
      return;
    }
    const montoNumero = Number(monto);
    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      setError('El monto debe ser mayor a cero');
      return;
    }
    setEnviando(true);
    try {
      const abono = await registrarAbono({
        participanteId,
        monto: montoNumero,
        fechaPago,
        observaciones: observaciones || undefined,
      });
      setComprobante(abono);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el abono');
    } finally {
      setEnviando(false);
    }
  }

  function nuevoAbono() {
    setComprobante(null);
    setMonto('');
    setObservaciones('');
    setFechaPago(hoyISO());
  }

  if (comprobante) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Abono registrado correctamente. Este es el comprobante:
        </div>
        <ComprobanteAbono abono={comprobante} />
        <button
          type="button"
          onClick={nuevoAbono}
          className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Registrar otro abono
        </button>
      </div>
    );
  }

  const estiloCampo =
    'mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none';

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-lg font-semibold text-gray-800">Registrar abono de evento</h2>

      <form onSubmit={manejarEnvio} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Evento (activo) *
          <select value={eventoId} onChange={(e) => setEventoId(e.target.value)} required className={estiloCampo}>
            <option value="">Seleccionar evento…</option>
            {eventos.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Miembro participante *
          <select
            value={participanteId}
            onChange={(e) => setParticipanteId(e.target.value)}
            required
            disabled={!detalleEvento}
            className={estiloCampo + ' disabled:bg-gray-100'}
          >
            <option value="">
              {detalleEvento ? 'Seleccionar participante…' : 'Elegí primero un evento'}
            </option>
            {detalleEvento?.participantes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.miembro.apellido}, {p.miembro.nombre} — abonado: {formatearMonto(p.totalAbonado)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Monto *
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            min="0.01"
            step="0.01"
            required
            placeholder="0,00"
            className={estiloCampo}
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Fecha de pago *
          <input
            type="date"
            value={fechaPago}
            onChange={(e) => setFechaPago(e.target.value)}
            required
            className={estiloCampo}
          />
        </label>

        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          Observaciones
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            className={estiloCampo}
          />
        </label>

        {detalleEvento && detalleEvento.participantes.length === 0 && (
          <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:col-span-2">
            El evento no tiene participantes. Agregalos desde el detalle del evento.
          </p>
        )}

        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</p>
        )}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={enviando}
            className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {enviando ? 'Registrando…' : 'Registrar abono'}
          </button>
        </div>
      </form>
    </div>
  );
}
