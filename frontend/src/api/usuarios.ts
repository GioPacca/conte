// Llamadas al backend para la gestión de usuarios ayudantes (solo tesorero).
import { llamarApi } from './http';
import type { Estado } from '../lib/traducciones';

export type UsuarioGestionado = {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  email: string;
  rol: 'TESORERO' | 'AYUDANTE';
  estado: Estado;
};

export type DatosAyudante = {
  nombre: string;
  apellido: string;
  telefono?: string;
  email: string;
  password?: string; // obligatoria al crear; opcional al editar
  estado?: string;
  rol?: string; // solo al crear: AYUDANTE (por defecto) o TESORERO
};

export function listarUsuarios(): Promise<UsuarioGestionado[]> {
  return llamarApi('/api/usuarios');
}

export function crearAyudante(datos: DatosAyudante): Promise<UsuarioGestionado> {
  return llamarApi('/api/usuarios', { method: 'POST', body: JSON.stringify(datos) });
}

export function editarAyudante(id: string, datos: Partial<DatosAyudante>): Promise<UsuarioGestionado> {
  return llamarApi(`/api/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
}

export function eliminarAyudante(id: string): Promise<{ mensaje: string }> {
  return llamarApi(`/api/usuarios/${id}`, { method: 'DELETE' });
}
