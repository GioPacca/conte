// Llamadas al backend para autenticación.
import { llamarApi } from './http';

export type Usuario = {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  email: string;
  rol: 'TESORERO' | 'AYUDANTE';
};

// Datos que cada usuario puede cambiar de sí mismo. Para cambiar la
// contraseña se exige la actual.
export type DatosPerfil = {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  email?: string;
  passwordActual?: string;
  passwordNueva?: string;
};

export function iniciarSesion(email: string, password: string): Promise<Usuario> {
  return llamarApi<Usuario>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function cerrarSesion(): Promise<{ mensaje: string }> {
  return llamarApi('/api/auth/logout', { method: 'POST' });
}

export function obtenerUsuarioActual(): Promise<Usuario> {
  return llamarApi<Usuario>('/api/auth/yo');
}

export function editarPerfil(datos: DatosPerfil): Promise<Usuario> {
  return llamarApi<Usuario>('/api/auth/perfil', {
    method: 'PUT',
    body: JSON.stringify(datos),
  });
}
