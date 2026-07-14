import { useState, type FormEvent } from 'react';
import { iniciarSesion, type Usuario } from '../api/auth';

// Pantalla de login: email + contraseña.
export function Login({ alIngresar }: { alIngresar: (usuario: Usuario) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const usuario = await iniciarSesion(email, password);
      alIngresar(usuario);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <form
        onSubmit={manejarEnvio}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow"
      >
        <h1 className="text-2xl font-bold text-emerald-700">CONTE</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tesorería — Club de Conquistadores
        </p>

        <label className="mt-6 block text-sm font-medium text-gray-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-emerald-600 focus:outline-none"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-gray-700">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-emerald-600 focus:outline-none"
          />
        </label>

        {error && (
          <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="mt-6 w-full rounded bg-emerald-700 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
