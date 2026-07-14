import { useState, type FormEvent } from 'react';
import { editarPerfil, type Usuario } from '../api/auth';

// Mi perfil: cada usuario (cualquier rol) edita su propia información.
// El rol y el estado no se tocan acá: son del tesorero. Para cambiar la
// contraseña hay que ingresar la actual.
export function Perfil({
  usuario,
  alActualizar,
}: {
  usuario: Usuario;
  alActualizar: (usuario: Usuario) => void;
}) {
  const [nombre, setNombre] = useState(usuario.nombre);
  const [apellido, setApellido] = useState(usuario.apellido);
  const [telefono, setTelefono] = useState(usuario.telefono ?? '');
  const [email, setEmail] = useState(usuario.email);
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);

    if (passwordNueva && !passwordActual) {
      setError('Para cambiar la contraseña tenés que ingresar la actual');
      return;
    }

    setEnviando(true);
    try {
      const actualizado = await editarPerfil({
        nombre,
        apellido,
        telefono,
        email,
        ...(passwordNueva ? { passwordActual, passwordNueva } : {}),
      });
      alActualizar(actualizado);
      setPasswordActual('');
      setPasswordNueva('');
      setAviso('Datos guardados.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los datos');
    } finally {
      setEnviando(false);
    }
  }

  const estiloCampo =
    'mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none';

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-lg font-semibold text-gray-800">Mi perfil</h2>
      <p className="mt-1 text-sm text-gray-500">
        Rol: {usuario.rol === 'TESORERO' ? 'Tesorero' : 'Ayudante'} (el rol no se
        cambia desde acá)
      </p>

      <form onSubmit={manejarEnvio} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Nombre *
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required className={estiloCampo} />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Apellido *
          <input value={apellido} onChange={(e) => setApellido(e.target.value)} required className={estiloCampo} />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Email *
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={estiloCampo} />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Teléfono
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className={estiloCampo} />
        </label>

        <div className="sm:col-span-2 rounded border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-700">
            Cambiar contraseña <span className="font-normal text-gray-500">(opcional)</span>
          </p>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              Contraseña actual
              <input
                type="password"
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                autoComplete="current-password"
                className={estiloCampo}
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Contraseña nueva (mínimo 8 caracteres)
              <input
                type="password"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                className={estiloCampo}
              />
            </label>
          </div>
        </div>

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
