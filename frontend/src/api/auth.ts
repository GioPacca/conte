// Llamadas al backend para autenticación.
import { llamarApi } from './http';

export type Usuario = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: 'TESORERO' | 'AYUDANTE';
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
