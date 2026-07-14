import { useEffect, useState, type FormEvent } from 'react';
import {
  listarEventos,
  obtenerEvento,
  crearEvento,
  editarEvento,
  eliminarEvento,
  agregarParticipante,
  quitarParticipante,
  registrarAbono,
  editarAbono,
  type EventoEnLista,
  type EventoDetalle,
  type DatosEvento,
  type Participante,
  type Abono,
  type AbonoDeParticipante,
} from '../api/eventos';
import { listarMiembros, type Miembro } from '../api/miembros';
import type { Usuario } from '../api/auth';
import { ComprobanteAbono } from '../components/ComprobanteAbono';
import { traducirUnidad, traducirRol, traducirEstado } from '../lib/traducciones';
import { formatearMonto, formatearFecha, hoyISO } from '../lib/formato';

// Pantalla de eventos: lista (nombre, fecha, estado, participantes),
// detalle con participantes/abonos/totales, y CRUD solo-tesorero.
// Evento INACTIVO: solo consulta (el backend también lo hace cumplir).
export function Eventos({ usuario }: { usuario: Usuario }) {
  const [lista, setLista] = useState<EventoEnLista[]>([]);
  const [detalle, setDetalle] = useState<EventoDetalle | null>(null);
  const [editando, setEditando] = useState<EventoDetalle | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const esTesorero = usuario.rol === 'TESORERO';

  async function cargarLista() {
    try {
      setLista(await listarEventos());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la lista');
    }
  }

  useEffect(() => {
    cargarLista();
  }, []);

  async function abrirDetalle(id: string) {
    setError(null);
    try {
      setDetalle(await obtenerEvento(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el detalle');
    }
  }

  async function manejarEliminar(id: string) {
    const seguro = window.confirm(
      'ATENCIÓN: se eliminará el evento Y TODOS sus participantes y abonos. Esta acción no se puede deshacer. ¿Continuar?'
    );
    if (!seguro) return;
    try {
      const r = await eliminarEvento(id);
      setAviso(r.mensaje);
      setDetalle(null);
      cargarLista();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  function cerrarFormulario(huboCambios: boolean) {
    setMostrarFormulario(false);
    const eventoEditado = editando;
    setEditando(null);
    if (huboCambios) {
      cargarLista();
      // Si se estaba editando desde el detalle, recargarlo
      if (eventoEditado) abrirDetalle(eventoEditado.id);
      else setDetalle(null);
    }
  }

  if (mostrarFormulario || editando) {
    return <FormularioEvento inicial={editando} alCerrar={cerrarFormulario} />;
  }

  if (detalle) {
    return (
      <DetalleEvento
        detalle={detalle}
        esTesorero={esTesorero}
        alVolver={() => setDetalle(null)}
        alEditar={() => setEditando(detalle)}
        alEliminar={() => manejarEliminar(detalle.id)}
        alRecargar={() => abrirDetalle(detalle.id)}
      />
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-800">Eventos</h2>
        {esTesorero && (
          <button
            type="button"
            onClick={() => { setAviso(null); setMostrarFormulario(true); }}
            className="ml-auto rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Nuevo evento
          </button>
        )}
      </div>

      {aviso && <p className="mt-4 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{aviso}</p>}
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {lista.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">Todavía no hay eventos creados.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-2 pr-4 font-medium">Nombre</th>
                <th className="py-2 pr-4 font-medium">Fecha</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
                <th className="py-2 font-medium">Participantes</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => abrirDetalle(e.id)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-emerald-50"
                >
                  <td className="py-2 pr-4">{e.nombre}</td>
                  <td className="py-2 pr-4">{formatearFecha(e.fecha)}</td>
                  <td className="py-2 pr-4">
                    <span className={e.estado === 'ACTIVO' ? 'text-emerald-700' : 'text-gray-400'}>
                      {traducirEstado(e.estado)}
                    </span>
                  </td>
                  <td className="py-2">{e.cantidadParticipantes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- Detalle de evento ----------

function DetalleEvento({
  detalle,
  esTesorero,
  alVolver,
  alEditar,
  alEliminar,
  alRecargar,
}: {
  detalle: EventoDetalle;
  esTesorero: boolean;
  alVolver: () => void;
  alEditar: () => void;
  alEliminar: () => void;
  alRecargar: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [miembroNuevo, setMiembroNuevo] = useState('');
  const [participanteAbierto, setParticipanteAbierto] = useState<string | null>(null);
  const [abonoPara, setAbonoPara] = useState<Participante | null>(null);
  const [comprobante, setComprobante] = useState<Abono | null>(null);

  const activo = detalle.estado === 'ACTIVO';

  // Miembros que aún no participan (para el selector de agregar)
  useEffect(() => {
    if (!activo) return;
    listarMiembros({})
      .then((todos) => {
        const yaParticipan = new Set(detalle.participantes.map((p) => p.miembro.id));
        setMiembros(todos.filter((m) => !yaParticipan.has(m.id)));
      })
      .catch(() => setError('No se pudieron cargar los miembros'));
  }, [detalle, activo]);

  async function manejarAgregar() {
    if (!miembroNuevo) return;
    setError(null);
    try {
      await agregarParticipante(detalle.id, miembroNuevo);
      setMiembroNuevo('');
      alRecargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo agregar');
    }
  }

  async function manejarQuitar(p: Participante) {
    const seguro = window.confirm(
      `Se quitará a ${p.miembro.nombre} ${p.miembro.apellido} del evento Y SE ELIMINARÁN sus ${p.abonos.length} abono(s) registrados. ¿Continuar?`
    );
    if (!seguro) return;
    setError(null);
    try {
      await quitarParticipante(detalle.id, p.id);
      alRecargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo quitar');
    }
  }

  // Historial de abonos del evento completo (todos los participantes)
  const abonosEvento = detalle.participantes
    .flatMap((p) =>
      p.abonos.map((a) => ({ ...a, miembro: `${p.miembro.apellido}, ${p.miembro.nombre}` }))
    )
    .sort((a, b) => b.fechaPago.localeCompare(a.fechaPago));

  // Tras registrar un abono se muestra el comprobante
  if (comprobante) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Abono registrado correctamente. Este es el comprobante:
        </div>
        <ComprobanteAbono abono={comprobante} />
        <button
          type="button"
          onClick={() => { setComprobante(null); alRecargar(); }}
          className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Volver al evento
        </button>
      </div>
    );
  }

  // Formulario de abono para un participante
  if (abonoPara) {
    return (
      <FormularioAbono
        participante={abonoPara}
        evento={detalle}
        alCancelar={() => setAbonoPara(null)}
        alRegistrar={(abono) => { setAbonoPara(null); setComprobante(abono); }}
      />
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{detalle.nombre}</h2>
          <span
            className={
              'mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ' +
              (activo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600')
            }
          >
            {traducirEstado(detalle.estado)}
          </span>
        </div>
        <button type="button" onClick={alVolver} className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a la lista
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <div><dt className="font-medium text-gray-500">Fecha</dt><dd>{formatearFecha(detalle.fecha)}</dd></div>
        <div>
          <dt className="font-medium text-gray-500">Total recaudado</dt>
          <dd className="font-bold text-emerald-700">{formatearMonto(detalle.totalRecaudado)}</dd>
        </div>
        <div><dt className="font-medium text-gray-500">Participantes</dt><dd>{detalle.participantes.length}</dd></div>
        {detalle.descripcion && (
          <div className="sm:col-span-3">
            <dt className="font-medium text-gray-500">Descripción</dt>
            <dd>{detalle.descripcion}</dd>
          </div>
        )}
      </dl>

      {!activo && (
        <p className="mt-4 rounded bg-gray-100 px-3 py-2 text-sm text-gray-600">
          Evento inactivo: solo consulta. No admite abonos ni cambios de participantes.
        </p>
      )}
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <h3 className="mt-6 font-medium text-gray-700">Participantes ({detalle.participantes.length})</h3>

      {activo && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={miembroNuevo}
            onChange={(e) => setMiembroNuevo(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-600 focus:outline-none"
          >
            <option value="">Agregar participante…</option>
            {miembros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.apellido}, {m.nombre} — DNI {m.dni}{m.estado === 'INACTIVO' ? ' (inactivo)' : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={manejarAgregar}
            disabled={!miembroNuevo}
            className="rounded bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Agregar
          </button>
        </div>
      )}

      {detalle.participantes.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">El evento no tiene participantes.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-2 pr-4 font-medium">Apellido y nombre</th>
                <th className="py-2 pr-4 font-medium">DNI</th>
                <th className="py-2 pr-4 font-medium">Teléfono</th>
                <th className="py-2 pr-4 font-medium">Rol</th>
                <th className="py-2 pr-4 font-medium">Unidad</th>
                <th className="py-2 pr-4 font-medium">Total abonado</th>
                <th className="py-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {detalle.participantes.map((p) => (
                <ParticipanteFila
                  key={p.id}
                  participante={p}
                  activo={activo}
                  esTesorero={esTesorero}
                  abierto={participanteAbierto === p.id}
                  alAlternar={() =>
                    setParticipanteAbierto(participanteAbierto === p.id ? null : p.id)
                  }
                  alAbonar={() => setAbonoPara(p)}
                  alQuitar={() => manejarQuitar(p)}
                  alRecargar={alRecargar}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="mt-6 font-medium text-gray-700">
        Historial de abonos del evento ({abonosEvento.length})
      </h3>
      {abonosEvento.length === 0 ? (
        <p className="mt-1 text-sm text-gray-500">No hay abonos registrados.</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-2 pr-4 font-medium">Miembro</th>
                <th className="py-2 pr-4 font-medium">Monto</th>
                <th className="py-2 pr-4 font-medium">Fecha</th>
                <th className="py-2 pr-4 font-medium">Registrado por</th>
                <th className="py-2 font-medium">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {abonosEvento.map((a) => (
                <tr key={a.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4">{a.miembro}</td>
                  <td className="py-2 pr-4">{formatearMonto(a.monto)}</td>
                  <td className="py-2 pr-4">{formatearFecha(a.fechaPago)}</td>
                  <td className="py-2 pr-4">
                    {a.registradoPor ? `${a.registradoPor.nombre} ${a.registradoPor.apellido}` : '—'}
                  </td>
                  <td className="py-2">{a.observaciones ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {esTesorero && (
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={alEditar}
            className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={alEliminar}
            className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

// Fila de participante, expandible para ver su historial de abonos.
function ParticipanteFila({
  participante: p,
  activo,
  esTesorero,
  abierto,
  alAlternar,
  alAbonar,
  alQuitar,
  alRecargar,
}: {
  participante: Participante;
  activo: boolean;
  esTesorero: boolean;
  abierto: boolean;
  alAlternar: () => void;
  alAbonar: () => void;
  alQuitar: () => void;
  alRecargar: () => void;
}) {
  return (
    <>
      <tr onClick={alAlternar} className="cursor-pointer border-b border-gray-100 hover:bg-emerald-50">
        <td className="py-2 pr-4">
          {p.miembro.apellido}, {p.miembro.nombre}
          {p.miembro.estado === 'INACTIVO' && (
            <span className="ml-1 text-xs text-gray-400">(inactivo)</span>
          )}
        </td>
        <td className="py-2 pr-4">{p.miembro.dni}</td>
        <td className="py-2 pr-4">{p.miembro.telefono ?? '—'}</td>
        <td className="py-2 pr-4">{traducirRol(p.miembro.rolMiembro)}</td>
        <td className="py-2 pr-4">{traducirUnidad(p.miembro.unidad)}</td>
        <td className="py-2 pr-4 font-medium">{formatearMonto(p.totalAbonado)}</td>
        <td className="py-2" onClick={(e) => e.stopPropagation()}>
          {activo && (
            <span className="flex gap-2">
              <button
                type="button"
                onClick={alAbonar}
                className="rounded bg-emerald-700 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-800"
              >
                Registrar abono
              </button>
              <button
                type="button"
                onClick={alQuitar}
                className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
              >
                Quitar
              </button>
            </span>
          )}
        </td>
      </tr>
      {abierto && (
        <tr className="border-b border-gray-100 bg-gray-50">
          <td colSpan={7} className="px-4 py-2">
            {p.abonos.length === 0 ? (
              <span className="text-xs text-gray-500">Sin abonos registrados.</span>
            ) : (
              <ul className="space-y-1 text-xs text-gray-600">
                {p.abonos.map((a) => (
                  <AbonoLinea key={a.id} abono={a} esTesorero={esTesorero} alRecargar={alRecargar} />
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// Línea de abono en el historial individual; el tesorero puede editarla.
function AbonoLinea({
  abono: a,
  esTesorero,
  alRecargar,
}: {
  abono: AbonoDeParticipante;
  esTesorero: boolean;
  alRecargar: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [monto, setMonto] = useState(a.monto);
  const [fecha, setFecha] = useState(a.fechaPago.slice(0, 10));
  const [obs, setObs] = useState(a.observaciones ?? '');
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setError(null);
    try {
      await editarAbono(a.id, {
        monto: Number(monto),
        fechaPago: fecha,
        observaciones: obs || undefined,
      });
      setEditando(false);
      alRecargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    }
  }

  if (editando) {
    return (
      <li className="flex flex-wrap items-center gap-2">
        <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} min="0.01" step="0.01" className="w-24 rounded border border-gray-300 px-2 py-0.5" />
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="rounded border border-gray-300 px-2 py-0.5" />
        <input type="text" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observaciones" className="w-40 rounded border border-gray-300 px-2 py-0.5" />
        <button type="button" onClick={guardar} className="rounded bg-emerald-700 px-2 py-0.5 text-white">Guardar</button>
        <button type="button" onClick={() => setEditando(false)} className="rounded border border-gray-300 px-2 py-0.5">Cancelar</button>
        {error && <span className="text-red-600">{error}</span>}
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-2">
      <span>
        {formatearFecha(a.fechaPago)} — {formatearMonto(a.monto)}
        {a.registradoPor && ` — registrado por ${a.registradoPor.nombre} ${a.registradoPor.apellido}`}
        {a.observaciones && ` — ${a.observaciones}`}
      </span>
      {esTesorero && (
        <button type="button" onClick={() => setEditando(true)} className="text-emerald-700 underline">
          Editar
        </button>
      )}
    </li>
  );
}

// ---------- Formulario de abono (desde el detalle del evento) ----------

function FormularioAbono({
  participante,
  evento,
  alCancelar,
  alRegistrar,
}: {
  participante: Participante;
  evento: EventoDetalle;
  alCancelar: () => void;
  alRegistrar: (abono: Abono) => void;
}) {
  const [monto, setMonto] = useState('');
  const [fechaPago, setFechaPago] = useState(hoyISO());
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const montoNumero = Number(monto);
    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      setError('El monto debe ser mayor a cero');
      return;
    }
    setEnviando(true);
    try {
      const abono = await registrarAbono({
        participanteId: participante.id,
        monto: montoNumero,
        fechaPago,
        observaciones: observaciones || undefined,
      });
      alRegistrar(abono);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el abono');
      setEnviando(false);
    }
  }

  const estiloCampo =
    'mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none';

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-lg font-semibold text-gray-800">Registrar abono de evento</h2>
      <p className="mt-1 text-sm text-gray-500">
        {participante.miembro.nombre} {participante.miembro.apellido} — {evento.nombre}
        {' · '}Total abonado hasta ahora: {formatearMonto(participante.totalAbonado)}
      </p>

      <form onSubmit={manejarEnvio} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</p>
        )}

        <div className="flex gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={enviando}
            className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {enviando ? 'Registrando…' : 'Registrar abono'}
          </button>
          <button
            type="button"
            onClick={alCancelar}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Formulario de evento (alta/edición, solo tesorero) ----------

function FormularioEvento({
  inicial,
  alCerrar,
}: {
  inicial: EventoDetalle | null;
  alCerrar: (huboCambios: boolean) => void;
}) {
  const [datos, setDatos] = useState<DatosEvento>({
    nombre: inicial?.nombre ?? '',
    descripcion: inicial?.descripcion ?? '',
    fecha: inicial ? inicial.fecha.slice(0, 10) : hoyISO(),
    estado: inicial?.estado ?? 'ACTIVO',
  });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      if (inicial) {
        await editarEvento(inicial.id, datos);
      } else {
        await crearEvento(datos);
      }
      alCerrar(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
      setEnviando(false);
    }
  }

  const estiloCampo =
    'mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none';

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-lg font-semibold text-gray-800">
        {inicial ? 'Editar evento' : 'Nuevo evento'}
      </h2>

      <form onSubmit={manejarEnvio} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          Nombre *
          <input value={datos.nombre} onChange={(e) => setDatos((d) => ({ ...d, nombre: e.target.value }))} required className={estiloCampo} />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Fecha *
          <input type="date" value={datos.fecha} onChange={(e) => setDatos((d) => ({ ...d, fecha: e.target.value }))} required className={estiloCampo} />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Estado
          <select value={datos.estado} onChange={(e) => setDatos((d) => ({ ...d, estado: e.target.value }))} className={estiloCampo}>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo (solo consulta)</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          Descripción
          <textarea value={datos.descripcion} onChange={(e) => setDatos((d) => ({ ...d, descripcion: e.target.value }))} rows={3} className={estiloCampo} />
        </label>

        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</p>
        )}

        <div className="flex gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={enviando}
            className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {enviando ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => alCerrar(false)}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
