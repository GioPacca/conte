// Llamadas al backend para la configuración del sistema (fila única).
import { llamarApi } from './http';

export type Configuracion = {
  id: number;
  nombreClub: string;
  anioActual: number;
};

export function obtenerConfiguracion(): Promise<Configuracion> {
  return llamarApi('/api/configuracion');
}

export function editarConfiguracion(datos: {
  nombreClub?: string;
  anioActual?: number;
}): Promise<Configuracion> {
  return llamarApi('/api/configuracion', { method: 'PUT', body: JSON.stringify(datos) });
}

// Cambio masivo: TODOS los miembros pasan a INACTIVO (solo tesorero)
export function inactivarTodosLosMiembros(): Promise<{ mensaje: string; cantidad: number }> {
  return llamarApi('/api/miembros/inactivar-todos', { method: 'POST' });
}
