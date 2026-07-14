import { useEffect, useState } from 'react';
import { Layout, type Pantalla } from './components/Layout';
import { Login } from './pages/Login';
import { Inicio } from './pages/Inicio';
import { Responsables } from './pages/Responsables';
import { Miembros } from './pages/Miembros';
import { Pagos } from './pages/Pagos';
import { Eventos } from './pages/Eventos';
import { Configuracion } from './pages/Configuracion';
import { Perfil } from './pages/Perfil';
import { cerrarSesion, obtenerUsuarioActual, type Usuario } from './api/auth';
import { obtenerConfiguracion, type Configuracion as Config } from './api/configuracion';

export default function App() {
  // undefined = todavía verificando si hay sesión; null = no hay sesión
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);
  const [pantalla, setPantalla] = useState<Pantalla>('inicio');
  const [config, setConfig] = useState<Config | null>(null);
  // Miembro preseleccionado al entrar a Pagos desde el detalle de un miembro
  const [miembroParaPago, setMiembroParaPago] = useState<string | null>(null);

  useEffect(() => {
    obtenerUsuarioActual()
      .then(setUsuario)
      .catch(() => setUsuario(null));
  }, []);

  // Con sesión iniciada, cargar la configuración (nombre del club y año
  // por defecto de formularios y filtros)
  useEffect(() => {
    if (usuario) {
      obtenerConfiguracion().then(setConfig).catch(() => setConfig(null));
    }
  }, [usuario]);

  function navegar(destino: Pantalla) {
    setMiembroParaPago(null); // la preselección solo vale al venir del detalle
    setPantalla(destino);
  }

  function irARegistrarPago(miembroId: string) {
    setMiembroParaPago(miembroId);
    setPantalla('pagos');
  }

  async function manejarSalir() {
    await cerrarSesion().catch(() => {});
    setUsuario(null);
    setPantalla('inicio');
  }

  if (usuario === undefined) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center text-gray-500">
        Cargando…
      </div>
    );
  }

  if (usuario === null) {
    return <Login alIngresar={setUsuario} />;
  }

  return (
    <Layout
      usuario={usuario}
      nombreClub={config?.nombreClub ?? 'Club de Conquistadores'}
      pantallaActual={pantalla}
      alNavegar={navegar}
      alSalir={manejarSalir}
    >
      {pantalla === 'inicio' && (
        <Inicio
          alRegistrarPago={() => navegar('pagos')}
          alVerEventos={() => navegar('eventos')}
        />
      )}
      {pantalla === 'miembros' && (
        <Miembros usuario={usuario} alRegistrarPago={irARegistrarPago} />
      )}
      {pantalla === 'responsables' && <Responsables usuario={usuario} />}
      {pantalla === 'pagos' && <Pagos miembroPreseleccionado={miembroParaPago} />}
      {pantalla === 'eventos' && <Eventos usuario={usuario} />}
      {pantalla === 'configuracion' && usuario.rol === 'TESORERO' && (
        <Configuracion usuario={usuario} alCambiarConfig={setConfig} />
      )}
      {pantalla === 'perfil' && <Perfil usuario={usuario} alActualizar={setUsuario} />}
    </Layout>
  );
}
