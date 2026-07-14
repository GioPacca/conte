import type { ReactNode } from 'react';
import type { Usuario } from '../api/auth';

// Las pantallas disponibles crecen con cada etapa.
export type Pantalla =
  | 'inicio'
  | 'miembros'
  | 'responsables'
  | 'pagos'
  | 'eventos'
  | 'configuracion';

const pantallas: { id: Pantalla; titulo: string; soloTesorero?: boolean }[] = [
  { id: 'inicio', titulo: 'Inicio' },
  { id: 'miembros', titulo: 'Miembros' },
  { id: 'responsables', titulo: 'Responsables' },
  { id: 'pagos', titulo: 'Pagos' },
  { id: 'eventos', titulo: 'Eventos' },
  { id: 'configuracion', titulo: 'Configuración', soloTesorero: true },
];

// Layout base: barra superior con navegación + contenido.
export function Layout({
  usuario,
  nombreClub,
  pantallaActual,
  alNavegar,
  alSalir,
  children,
}: {
  usuario: Usuario;
  nombreClub: string;
  pantallaActual: Pantalla;
  alNavegar: (pantalla: Pantalla) => void;
  alSalir: () => void;
  children: ReactNode;
}) {
  const visibles = pantallas.filter((p) => !p.soloTesorero || usuario.rol === 'TESORERO');

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-emerald-700 text-white shadow">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <h1 className="text-xl font-bold">CONTE</h1>
          <span className="text-sm text-emerald-100">
            Tesorería — {nombreClub}
          </span>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span>
              {usuario.nombre} {usuario.apellido}
              <span className="ml-1 text-emerald-200">
                ({usuario.rol === 'TESORERO' ? 'Tesorero' : 'Ayudante'})
              </span>
            </span>
            <button
              type="button"
              onClick={alSalir}
              className="rounded border border-emerald-300 px-2 py-1 text-emerald-100 hover:bg-emerald-600"
            >
              Salir
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-5xl px-4 flex gap-1">
          {visibles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => alNavegar(p.id)}
              className={
                'rounded-t px-4 py-2 text-sm font-medium ' +
                (p.id === pantallaActual
                  ? 'bg-gray-100 text-emerald-800'
                  : 'text-emerald-100 hover:bg-emerald-600')
              }
            >
              {p.titulo}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
