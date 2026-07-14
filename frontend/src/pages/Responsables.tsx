import { useEffect, useState, type FormEvent } from 'react';
import {
  listarResponsables,
  obtenerResponsable,
  crearResponsable,
  editarResponsable,
  eliminarResponsable,
  type ResponsableEnLista,
  type ResponsableDetalle,
  type DatosResponsable,
} from '../api/responsables';
import type { Usuario } from '../api/auth';

// Pantalla de responsables: tabla con búsqueda, alta, detalle con
// miembros asociados, edición y eliminación (solo tesorero).
export function Responsables({ usuario }: { usuario: Usuario }) {
  // vista: lista | formulario (alta o edición) | detalle
  const [lista, setLista] = useState<ResponsableEnLista[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [detalle, setDetalle] = useState<ResponsableDetalle | null>(null);
  const [editando, setEditando] = useState<ResponsableDetalle | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const esTesorero = usuario.rol === 'TESORERO';

  async function cargarLista(texto: string) {
    try {
      setLista(await listarResponsables(texto));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la lista');
    }
  }

  // Recargar al escribir en la búsqueda (con una pequeña espera)
  useEffect(() => {
    const timer = setTimeout(() => cargarLista(busqueda), 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  async function abrirDetalle(id: string) {
    setError(null);
    try {
      setDetalle(await obtenerResponsable(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el detalle');
    }
  }

  async function manejarEliminar(id: string) {
    const seguro = window.confirm(
      'Se eliminará el responsable. Sus miembros quedarán sin responsable asociado (los miembros NO se eliminan). ¿Continuar?'
    );
    if (!seguro) return;
    setError(null);
    try {
      const r = await eliminarResponsable(id);
      setAviso(r.mensaje);
      setDetalle(null);
      cargarLista(busqueda);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  function cerrarFormulario(huboCambios: boolean) {
    setMostrarFormulario(false);
    setEditando(null);
    if (huboCambios) {
      setDetalle(null);
      cargarLista(busqueda);
    }
  }

  // --- Vista formulario (alta o edición) ---
  if (mostrarFormulario || editando) {
    return (
      <FormularioResponsable
        inicial={editando}
        alCerrar={cerrarFormulario}
      />
    );
  }

  // --- Vista detalle ---
  if (detalle) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            {detalle.apellido}, {detalle.nombre}
          </h2>
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
          <div><dt className="font-medium text-gray-500">Tipo de relación</dt><dd>{detalle.tipoRelacion ?? '—'}</dd></div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-gray-500">Observaciones</dt>
            <dd>{detalle.observaciones ?? '—'}</dd>
          </div>
        </dl>

        <h3 className="mt-6 font-medium text-gray-700">
          Miembros asociados ({detalle.miembros.length})
        </h3>
        {detalle.miembros.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">No tiene miembros asociados.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100 text-sm">
            {detalle.miembros.map((m) => (
              <li key={m.id} className="flex justify-between py-2">
                <span>{m.apellido}, {m.nombre} — DNI {m.dni}</span>
                <span className={m.estado === 'ACTIVO' ? 'text-emerald-700' : 'text-gray-400'}>
                  {m.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                </span>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => setEditando(detalle)}
            className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
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
        <h2 className="text-lg font-semibold text-gray-800">Responsables</h2>
        <input
          type="search"
          placeholder="Buscar por nombre, apellido o DNI…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="ml-auto w-72 rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-600 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => { setAviso(null); setMostrarFormulario(true); }}
          className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Nuevo responsable
        </button>
      </div>

      {aviso && <p className="mt-4 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{aviso}</p>}
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {lista.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          {busqueda ? 'No hay responsables que coincidan con la búsqueda.' : 'Todavía no hay responsables cargados.'}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-2 pr-4 font-medium">Apellido y nombre</th>
                <th className="py-2 pr-4 font-medium">DNI</th>
                <th className="py-2 pr-4 font-medium">Teléfono</th>
                <th className="py-2 pr-4 font-medium">Relación</th>
                <th className="py-2 font-medium">Miembros</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => abrirDetalle(r.id)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-emerald-50"
                >
                  <td className="py-2 pr-4">{r.apellido}, {r.nombre}</td>
                  <td className="py-2 pr-4">{r.dni}</td>
                  <td className="py-2 pr-4">{r.telefono ?? '—'}</td>
                  <td className="py-2 pr-4">{r.tipoRelacion ?? '—'}</td>
                  <td className="py-2">{r.cantidadMiembros}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Formulario de alta/edición. Si `inicial` viene con datos, es edición.
function FormularioResponsable({
  inicial,
  alCerrar,
}: {
  inicial: ResponsableDetalle | null;
  alCerrar: (huboCambios: boolean) => void;
}) {
  const [datos, setDatos] = useState<DatosResponsable>({
    nombre: inicial?.nombre ?? '',
    apellido: inicial?.apellido ?? '',
    dni: inicial?.dni ?? '',
    telefono: inicial?.telefono ?? '',
    tipoRelacion: inicial?.tipoRelacion ?? '',
    observaciones: inicial?.observaciones ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function cambiar(campo: keyof DatosResponsable, valor: string) {
    setDatos((d) => ({ ...d, [campo]: valor }));
  }

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      if (inicial) {
        await editarResponsable(inicial.id, datos);
      } else {
        await crearResponsable(datos);
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
        {inicial ? 'Editar responsable' : 'Nuevo responsable'}
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
          Tipo de relación (madre, padre, tutor…)
          <input value={datos.tipoRelacion} onChange={(e) => cambiar('tipoRelacion', e.target.value)} className={estiloCampo} />
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
