import { useEffect, useState, type FormEvent } from 'react';
import {
  listarMiembros,
  listarMiembrosSinPago,
  obtenerMiembro,
  crearMiembro,
  editarMiembro,
  eliminarMiembro,
  type Miembro,
  type MiembroDetalle,
  type DatosMiembro,
  type FiltrosMiembros,
  type PagoDeMiembro,
} from '../api/miembros';
import { editarPago } from '../api/pagos';
import { listarResponsables, type ResponsableEnLista } from '../api/responsables';
import type { Usuario } from '../api/auth';
import {
  UNIDADES,
  ROLES_MIEMBRO,
  ESTADOS,
  traducirUnidad,
  traducirRol,
  traducirEstado,
} from '../lib/traducciones';
import { MESES, nombreMes, formatearMonto, formatearFecha } from '../lib/formato';

// Pantalla de miembros: tabla con búsqueda y filtros (unidad/estado/rol),
// alta, detalle (con historial de pagos), edición y eliminación (solo tesorero).
// El selector mes+año de "sin pago" se agrega en la Etapa 5.
// `alRegistrarPago` navega a la pantalla de pagos con el miembro preseleccionado.
export function Miembros({
  usuario,
  alRegistrarPago,
}: {
  usuario: Usuario;
  alRegistrarPago: (miembroId: string) => void;
}) {
  const [lista, setLista] = useState<Miembro[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroUnidad, setFiltroUnidad] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  // Consulta "sin registro de pago": mes vacío = consulta desactivada.
  // El año por defecto es el del sistema.
  const [mesSinPago, setMesSinPago] = useState('');
  const [anioSinPago, setAnioSinPago] = useState(new Date().getFullYear());
  const [detalle, setDetalle] = useState<MiembroDetalle | null>(null);
  const [editando, setEditando] = useState<MiembroDetalle | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const esTesorero = usuario.rol === 'TESORERO';

  async function cargarLista(filtros: FiltrosMiembros) {
    try {
      // Si hay un mes elegido, la lista muestra los SIN registro de pago
      if (mesSinPago) {
        setLista(await listarMiembrosSinPago(Number(mesSinPago), anioSinPago, filtros));
      } else {
        setLista(await listarMiembros(filtros));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la lista');
    }
  }

  // Recargar cuando cambia la búsqueda (con espera), un filtro o el período sin-pago
  useEffect(() => {
    const filtros = { busqueda, unidad: filtroUnidad, estado: filtroEstado, rol: filtroRol };
    const timer = setTimeout(() => cargarLista(filtros), 300);
    return () => clearTimeout(timer);
  }, [busqueda, filtroUnidad, filtroEstado, filtroRol, mesSinPago, anioSinPago]);

  async function abrirDetalle(id: string) {
    setError(null);
    try {
      setDetalle(await obtenerMiembro(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el detalle');
    }
  }

  async function manejarEliminar(id: string) {
    const seguro = window.confirm(
      'ATENCIÓN: se eliminará el miembro Y TODOS sus pagos de cuota, participaciones en eventos y abonos. Esta acción no se puede deshacer. ¿Continuar?'
    );
    if (!seguro) return;
    setError(null);
    try {
      const r = await eliminarMiembro(id);
      setAviso(r.mensaje);
      setDetalle(null);
      cargarLista({ busqueda, unidad: filtroUnidad, estado: filtroEstado, rol: filtroRol });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  function cerrarFormulario(huboCambios: boolean) {
    setMostrarFormulario(false);
    setEditando(null);
    if (huboCambios) {
      setDetalle(null);
      cargarLista({ busqueda, unidad: filtroUnidad, estado: filtroEstado, rol: filtroRol });
    }
  }

  const estiloFiltro =
    'rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-600 focus:outline-none';

  // --- Vista formulario ---
  if (mostrarFormulario || editando) {
    return <FormularioMiembro inicial={editando} alCerrar={cerrarFormulario} />;
  }

  // --- Vista detalle ---
  if (detalle) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {detalle.apellido}, {detalle.nombre}
            </h2>
            <span
              className={
                'mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ' +
                (detalle.estado === 'ACTIVO'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-200 text-gray-600')
              }
            >
              {traducirEstado(detalle.estado)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDetalle(null)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Volver a la lista
          </button>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div><dt className="font-medium text-gray-500">DNI</dt><dd>{detalle.dni}</dd></div>
          <div><dt className="font-medium text-gray-500">Teléfono</dt><dd>{detalle.telefono ?? '—'}</dd></div>
          <div><dt className="font-medium text-gray-500">Unidad</dt><dd>{traducirUnidad(detalle.unidad)}</dd></div>
          <div><dt className="font-medium text-gray-500">Rol</dt><dd>{traducirRol(detalle.rolMiembro)}</dd></div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-gray-500">Responsable</dt>
            <dd>
              {detalle.responsable
                ? `${detalle.responsable.apellido}, ${detalle.responsable.nombre}` +
                  (detalle.responsable.tipoRelacion ? ` (${detalle.responsable.tipoRelacion})` : '') +
                  ` — DNI ${detalle.responsable.dni}` +
                  (detalle.responsable.telefono ? ` — Tel. ${detalle.responsable.telefono}` : '')
                : 'Sin responsable asociado'}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-gray-500">Observaciones</dt>
            <dd>{detalle.observaciones ?? '—'}</dd>
          </div>
        </dl>

        <h3 className="mt-6 font-medium text-gray-700">
          Historial de pagos de cuota de actividad ({detalle.pagos.length})
        </h3>
        {detalle.pagos.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">No tiene pagos registrados.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="py-2 pr-4 font-medium">Período</th>
                  <th className="py-2 pr-4 font-medium">Monto</th>
                  <th className="py-2 pr-4 font-medium">Fecha de pago</th>
                  <th className="py-2 pr-4 font-medium">Registrado por</th>
                  <th className="py-2 pr-4 font-medium">Observaciones</th>
                  <th className="py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {detalle.pagos.map((p) => (
                  <PagoFila key={p.id} pago={p} alRecargar={() => abrirDetalle(detalle.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="mt-6 font-medium text-gray-700">
          Eventos en los que participa ({detalle.eventos.length})
        </h3>
        {detalle.eventos.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">No participa de ningún evento.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100 text-sm">
            {detalle.eventos.map((e) => (
              <li key={e.participanteId} className="flex justify-between py-2">
                <span>
                  {e.evento.nombre} — {formatearFecha(e.evento.fecha)}
                  {e.evento.estado === 'INACTIVO' && (
                    <span className="ml-1 text-xs text-gray-400">(inactivo)</span>
                  )}
                </span>
                <span className="font-medium">{formatearMonto(e.totalAbonado)}</span>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => alRegistrarPago(detalle.id)}
            className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Registrar pago
          </button>
          <button
            type="button"
            onClick={() => setEditando(detalle)}
            className="rounded border border-emerald-700 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
          >
            Editar
          </button>
          {esTesorero && (
            <button
              type="button"
              onClick={() => manejarEliminar(detalle.id)}
              className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- Vista lista ---
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-800">Miembros</h2>
        <button
          type="button"
          onClick={() => { setAviso(null); setMostrarFormulario(true); }}
          className="ml-auto rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Nuevo miembro
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Buscar por nombre, apellido, DNI o responsable…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={estiloFiltro + ' w-80'}
        />
        <select value={filtroUnidad} onChange={(e) => setFiltroUnidad(e.target.value)} className={estiloFiltro}>
          <option value="">Unidad: todas</option>
          {Object.entries(UNIDADES).map(([valor, texto]) => (
            <option key={valor} value={valor}>{texto}</option>
          ))}
        </select>
        <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)} className={estiloFiltro}>
          <option value="">Rol: todos</option>
          {Object.entries(ROLES_MIEMBRO).map(([valor, texto]) => (
            <option key={valor} value={valor}>{texto}</option>
          ))}
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className={estiloFiltro}>
          <option value="">Estado: todos</option>
          {Object.entries(ESTADOS).map(([valor, texto]) => (
            <option key={valor} value={valor}>{texto}</option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded bg-gray-50 px-3 py-2">
        <span className="text-sm text-gray-600">Ver sin registro de pago en:</span>
        <select value={mesSinPago} onChange={(e) => setMesSinPago(e.target.value)} className={estiloFiltro}>
          <option value="">(elegir mes)</option>
          {MESES.map((nombre, i) => (
            <option key={i + 1} value={i + 1}>{nombre}</option>
          ))}
        </select>
        <input
          type="number"
          value={anioSinPago}
          onChange={(e) => setAnioSinPago(Number(e.target.value))}
          min={2000}
          max={2100}
          className={estiloFiltro + ' w-24'}
        />
        {mesSinPago && (
          <>
            <span className="text-sm font-medium text-amber-700">
              Mostrando miembros sin registro de pago en {nombreMes(Number(mesSinPago))} {anioSinPago}
            </span>
            <button
              type="button"
              onClick={() => setMesSinPago('')}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
            >
              Quitar
            </button>
          </>
        )}
      </div>

      {aviso && <p className="mt-4 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{aviso}</p>}
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {lista.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          {mesSinPago
            ? `Todos los miembros que coinciden con los filtros tienen pago registrado en ${nombreMes(Number(mesSinPago))} ${anioSinPago}.`
            : busqueda || filtroUnidad || filtroEstado || filtroRol
              ? 'No hay miembros que coincidan con la búsqueda o los filtros.'
              : 'Todavía no hay miembros cargados.'}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-2 pr-4 font-medium">Apellido y nombre</th>
                <th className="py-2 pr-4 font-medium">DNI</th>
                <th className="py-2 pr-4 font-medium">Unidad</th>
                <th className="py-2 pr-4 font-medium">Rol</th>
                <th className="py-2 pr-4 font-medium">Responsable</th>
                <th className="py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => abrirDetalle(m.id)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-emerald-50"
                >
                  <td className="py-2 pr-4">{m.apellido}, {m.nombre}</td>
                  <td className="py-2 pr-4">{m.dni}</td>
                  <td className="py-2 pr-4">{traducirUnidad(m.unidad)}</td>
                  <td className="py-2 pr-4">{traducirRol(m.rolMiembro)}</td>
                  <td className="py-2 pr-4">
                    {m.responsable ? `${m.responsable.apellido}, ${m.responsable.nombre}` : '—'}
                  </td>
                  <td className="py-2">
                    <span className={m.estado === 'ACTIVO' ? 'text-emerald-700' : 'text-gray-400'}>
                      {traducirEstado(m.estado)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Formulario de alta/edición. Si "inicial" viene con datos, es edición.
function FormularioMiembro({
  inicial,
  alCerrar,
}: {
  inicial: MiembroDetalle | null;
  alCerrar: (huboCambios: boolean) => void;
}) {
  const [datos, setDatos] = useState<DatosMiembro>({
    nombre: inicial?.nombre ?? '',
    apellido: inicial?.apellido ?? '',
    dni: inicial?.dni ?? '',
    telefono: inicial?.telefono ?? '',
    unidad: inicial?.unidad ?? '',
    rolMiembro: inicial?.rolMiembro ?? 'CONQUISTADOR',
    estado: inicial?.estado ?? 'ACTIVO',
    responsableId: inicial?.responsable?.id ?? '',
    observaciones: inicial?.observaciones ?? '',
  });
  const [responsables, setResponsables] = useState<ResponsableEnLista[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Cargar los responsables para el selector
  useEffect(() => {
    listarResponsables('')
      .then(setResponsables)
      .catch(() => setError('No se pudieron cargar los responsables'));
  }, []);

  function cambiar(campo: keyof DatosMiembro, valor: string) {
    setDatos((d) => ({ ...d, [campo]: valor }));
  }

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      if (inicial) {
        await editarMiembro(inicial.id, datos);
      } else {
        await crearMiembro(datos);
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
        {inicial ? 'Editar miembro' : 'Nuevo miembro'}
      </h2>

      <form onSubmit={manejarEnvio} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Nombre *
          <input value={datos.nombre} onChange={(e) => cambiar('nombre', e.target.value)} required className={estiloCampo} />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Apellido *
          <input value={datos.apellido} onChange={(e) => cambiar('apellido', e.target.value)} required className={estiloCampo} />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          DNI *
          <input value={datos.dni} onChange={(e) => cambiar('dni', e.target.value)} required className={estiloCampo} />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Teléfono
          <input value={datos.telefono} onChange={(e) => cambiar('telefono', e.target.value)} className={estiloCampo} />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Rol *
          <select value={datos.rolMiembro} onChange={(e) => cambiar('rolMiembro', e.target.value)} className={estiloCampo}>
            {Object.entries(ROLES_MIEMBRO).map(([valor, texto]) => (
              <option key={valor} value={valor}>{texto}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Unidad
          <select value={datos.unidad} onChange={(e) => cambiar('unidad', e.target.value)} className={estiloCampo}>
            <option value="">Sin unidad</option>
            {Object.entries(UNIDADES).map(([valor, texto]) => (
              <option key={valor} value={valor}>{texto}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Responsable
          <select value={datos.responsableId} onChange={(e) => cambiar('responsableId', e.target.value)} className={estiloCampo}>
            <option value="">Sin responsable asociado</option>
            {responsables.map((r) => (
              <option key={r.id} value={r.id}>{r.apellido}, {r.nombre} — DNI {r.dni}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Estado
          <select value={datos.estado} onChange={(e) => cambiar('estado', e.target.value)} className={estiloCampo}>
            {Object.entries(ESTADOS).map(([valor, texto]) => (
              <option key={valor} value={valor}>{texto}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          Observaciones
          <textarea value={datos.observaciones} onChange={(e) => cambiar('observaciones', e.target.value)} rows={3} className={estiloCampo} />
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

// Fila de pago del historial, con edición en línea (cualquier usuario).
// Modificables: mes, año, monto, fecha y observaciones. Si el nuevo
// período ya tiene pago, el backend responde 409 y se muestra el error.
function PagoFila({ pago: p, alRecargar }: { pago: PagoDeMiembro; alRecargar: () => void }) {
  const [editando, setEditando] = useState(false);
  const [mes, setMes] = useState(p.mes);
  const [anio, setAnio] = useState(p.anio);
  const [monto, setMonto] = useState(p.monto);
  const [fecha, setFecha] = useState(p.fechaPago.slice(0, 10));
  const [obs, setObs] = useState(p.observaciones ?? '');
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setError(null);
    try {
      await editarPago(p.id, {
        mes,
        anio,
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

  const estiloCampo = 'rounded border border-gray-300 px-2 py-0.5 text-sm';

  if (editando) {
    return (
      <tr className="border-b border-gray-100 bg-gray-50">
        <td colSpan={6} className="px-2 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className={estiloCampo}>
              {MESES.map((nombre, i) => (
                <option key={i + 1} value={i + 1}>{nombre}</option>
              ))}
            </select>
            <input type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} min={2000} max={2100} className={estiloCampo + ' w-20'} />
            <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} min="0.01" step="0.01" className={estiloCampo + ' w-28'} />
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={estiloCampo} />
            <input type="text" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observaciones" className={estiloCampo + ' w-40'} />
            <button type="button" onClick={guardar} className="rounded bg-emerald-700 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-800">
              Guardar
            </button>
            <button type="button" onClick={() => setEditando(false)} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100">
              Cancelar
            </button>
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 pr-4">{nombreMes(p.mes)} {p.anio}</td>
      <td className="py-2 pr-4">{formatearMonto(p.monto)}</td>
      <td className="py-2 pr-4">{formatearFecha(p.fechaPago)}</td>
      <td className="py-2 pr-4">
        {p.registradoPor ? `${p.registradoPor.nombre} ${p.registradoPor.apellido}` : '—'}
      </td>
      <td className="py-2 pr-4">{p.observaciones ?? '—'}</td>
      <td className="py-2">
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="rounded border border-emerald-700 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
        >
          Editar
        </button>
      </td>
    </tr>
  );
}
