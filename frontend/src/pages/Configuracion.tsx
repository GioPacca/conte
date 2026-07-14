import { useEffect, useState, type FormEvent } from 'react';
import {
  obtenerConfiguracion,
  editarConfiguracion,
  inactivarTodosLosMiembros,
  type Configuracion as Config,
} from '../api/configuracion';
import {
  listarUsuarios,
  crearAyudante,
  editarAyudante,
  eliminarAyudante,
  type UsuarioGestionado,
  type DatosAyudante,
} from '../api/usuarios';
import { traducirEstado } from '../lib/traducciones';

// Pantalla de configuración (solo tesorero — pantalla 9 de la especificación):
// datos del club, gestión de ayudantes y cambio masivo a inactivo.
// `alCambiarConfig` avisa a App para refrescar el nombre del club y el año.
export function Configuracion({ alCambiarConfig }: { alCambiarConfig: (c: Config) => void }) {
  return (
    <div className="space-y-6">
      <SeccionDatosClub alCambiarConfig={alCambiarConfig} />
      <SeccionAyudantes />
      <SeccionCambioMasivo />
    </div>
  );
}

// ---------- Sección 1: nombre del club y año actual ----------

function SeccionDatosClub({ alCambiarConfig }: { alCambiarConfig: (c: Config) => void }) {
  const [nombreClub, setNombreClub] = useState('');
  const [anioActual, setAnioActual] = useState<number>(new Date().getFullYear());
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    obtenerConfiguracion()
      .then((c) => {
        setNombreClub(c.nombreClub);
        setAnioActual(c.anioActual);
      })
      .catch(() => setError('No se pudo cargar la configuración'));
  }, []);

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setEnviando(true);
    try {
      const config = await editarConfiguracion({ nombreClub, anioActual });
      alCambiarConfig(config);
      setAviso('Configuración guardada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setEnviando(false);
    }
  }

  const estiloCampo =
    'mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none';

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-lg font-semibold text-gray-800">Datos del club</h2>
      <form onSubmit={manejarEnvio} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Nombre del club *
          <input value={nombreClub} onChange={(e) => setNombreClub(e.target.value)} required className={estiloCampo} />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Año actual *
          <input
            type="number"
            value={anioActual}
            onChange={(e) => setAnioActual(Number(e.target.value))}
            min={2000}
            max={2100}
            required
            className={estiloCampo}
          />
          <span className="mt-1 block text-xs font-normal text-gray-500">
            Solo es el valor por defecto en formularios y filtros; no restringe nada
            y no se actualiza automáticamente.
          </span>
        </label>

        {aviso && <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800 sm:col-span-2">{aviso}</p>}
        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</p>}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={enviando}
            className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {enviando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Sección 2: gestión de ayudantes ----------

function SeccionAyudantes() {
  const [usuarios, setUsuarios] = useState<UsuarioGestionado[]>([]);
  const [editando, setEditando] = useState<UsuarioGestionado | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function cargar() {
    try {
      setUsuarios(await listarUsuarios());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los usuarios');
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function manejarEliminar(u: UsuarioGestionado) {
    const seguro = window.confirm(
      `Se eliminará el usuario ${u.nombre} ${u.apellido}. Los pagos y abonos que registró conservan el registro, sin referencia al usuario. ¿Continuar?`
    );
    if (!seguro) return;
    setError(null);
    try {
      const r = await eliminarAyudante(u.id);
      setAviso(r.mensaje);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  function cerrarFormulario(huboCambios: boolean) {
    setMostrarFormulario(false);
    setEditando(null);
    if (huboCambios) cargar();
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-800">Gestión de ayudantes</h2>
        <button
          type="button"
          onClick={() => { setAviso(null); setMostrarFormulario(true); }}
          className="ml-auto rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Nuevo ayudante
        </button>
      </div>

      {(mostrarFormulario || editando) && (
        <FormularioAyudante inicial={editando} alCerrar={cerrarFormulario} />
      )}

      {aviso && <p className="mt-4 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{aviso}</p>}
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="py-2 pr-4 font-medium">Apellido y nombre</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Teléfono</th>
              <th className="py-2 pr-4 font-medium">Rol</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
              <th className="py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-gray-100">
                <td className="py-2 pr-4">{u.apellido}, {u.nombre}</td>
                <td className="py-2 pr-4">{u.email}</td>
                <td className="py-2 pr-4">{u.telefono ?? '—'}</td>
                <td className="py-2 pr-4">{u.rol === 'TESORERO' ? 'Tesorero' : 'Ayudante'}</td>
                <td className="py-2 pr-4">
                  <span className={u.estado === 'ACTIVO' ? 'text-emerald-700' : 'text-gray-400'}>
                    {traducirEstado(u.estado)}
                  </span>
                </td>
                <td className="py-2">
                  {u.rol === 'AYUDANTE' && (
                    <span className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setAviso(null); setEditando(u); }}
                        className="rounded border border-emerald-700 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => manejarEliminar(u)}
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Formulario de alta/edición de ayudante.
function FormularioAyudante({
  inicial,
  alCerrar,
}: {
  inicial: UsuarioGestionado | null;
  alCerrar: (huboCambios: boolean) => void;
}) {
  const [datos, setDatos] = useState<DatosAyudante>({
    nombre: inicial?.nombre ?? '',
    apellido: inicial?.apellido ?? '',
    telefono: inicial?.telefono ?? '',
    email: inicial?.email ?? '',
    password: '',
    estado: inicial?.estado ?? 'ACTIVO',
  });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function cambiar(campo: keyof DatosAyudante, valor: string) {
    setDatos((d) => ({ ...d, [campo]: valor }));
  }

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      if (inicial) {
        // Al editar, la contraseña solo se envía si se completó
        const { password, ...resto } = datos;
        await editarAyudante(inicial.id, password ? datos : resto);
      } else {
        await crearAyudante(datos);
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
    <form onSubmit={manejarEnvio} className="mt-4 grid grid-cols-1 gap-4 rounded border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
      <h3 className="text-sm font-semibold text-gray-700 sm:col-span-2">
        {inicial ? `Editar ayudante: ${inicial.nombre} ${inicial.apellido}` : 'Nuevo ayudante'}
      </h3>
      <label className="block text-sm font-medium text-gray-700">
        Nombre *
        <input value={datos.nombre} onChange={(e) => cambiar('nombre', e.target.value)} required className={estiloCampo} />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Apellido *
        <input value={datos.apellido} onChange={(e) => cambiar('apellido', e.target.value)} required className={estiloCampo} />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Email *
        <input type="email" value={datos.email} onChange={(e) => cambiar('email', e.target.value)} required className={estiloCampo} />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Teléfono
        <input value={datos.telefono} onChange={(e) => cambiar('telefono', e.target.value)} className={estiloCampo} />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        {inicial ? 'Nueva contraseña (dejar vacío para no cambiarla)' : 'Contraseña * (mínimo 8 caracteres)'}
        <input
          type="password"
          value={datos.password}
          onChange={(e) => cambiar('password', e.target.value)}
          required={!inicial}
          minLength={8}
          className={estiloCampo}
        />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Estado
        <select value={datos.estado} onChange={(e) => cambiar('estado', e.target.value)} className={estiloCampo}>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo (no puede iniciar sesión)</option>
        </select>
      </label>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</p>}

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
  );
}

// ---------- Sección 3: cambio masivo a inactivo ----------

function SeccionCambioMasivo() {
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function manejarCambioMasivo() {
    const seguro = window.confirm(
      'ATENCIÓN: TODOS los miembros del club pasarán a estado INACTIVO. Los pagos e historiales no se modifican. Esta acción se usa típicamente al cerrar el año. ¿Continuar?'
    );
    if (!seguro) return;
    setError(null);
    setAviso(null);
    setEnviando(true);
    try {
      const r = await inactivarTodosLosMiembros();
      setAviso(r.mensaje);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo ejecutar el cambio masivo');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-lg font-semibold text-gray-800">Cambio masivo a inactivo</h2>
      <p className="mt-2 text-sm text-gray-600">
        Marca a TODOS los miembros como inactivos (típicamente al iniciar un nuevo año,
        para reactivar solo a quienes continúan). No modifica pagos ni historiales.
      </p>

      {aviso && <p className="mt-4 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{aviso}</p>}
      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="button"
        onClick={manejarCambioMasivo}
        disabled={enviando}
        className="mt-4 rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {enviando ? 'Ejecutando…' : 'Marcar todos los miembros como inactivos'}
      </button>
    </div>
  );
}
