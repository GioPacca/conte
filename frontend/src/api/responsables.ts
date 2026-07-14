// Llamadas al backend para responsables.
import { llamarApi } from './http';

export type Responsable = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string | null;
  tipoRelacion: string | null;
  observaciones: string | null;
};

// La lista incluye cuántos miembros tiene asociados cada responsable
export type ResponsableEnLista = Responsable & { cantidadMiembros: number };

// El detalle incluye los miembros asociados
export type MiembroAsociado = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  estado: 'ACTIVO' | 'INACTIVO';
};
export type ResponsableDetalle = Responsable & { miembros: MiembroAsociado[] };

// Campos que se envían al crear o editar
export type DatosResponsable = {
  nombre: string;
  apellido: string;
  dni: string;
  telefono?: string;
  tipoRelacion?: string;
  observaciones?: string;
};

export function listarResponsables(busqueda: string): Promise<ResponsableEnLista[]> {
  const query = busqueda ? `?busqueda=${encodeURIComponent(busqueda)}` : '';
  return llamarApi(`/api/responsables${query}`);
}

export function obtenerResponsable(id: string): Promise<ResponsableDetalle> {
  return llamarApi(`/api/responsables/${id}`);
}

export function crearResponsable(datos: DatosResponsable): Promise<Responsable> {
  return llamarApi('/api/responsables', { method: 'POST', body: JSON.stringify(datos) });
}

export function editarResponsable(id: string, datos: DatosResponsable): Promise<Responsable> {
  return llamarApi(`/api/responsables/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
}

export function eliminarResponsable(id: string): Promise<{ mensaje: string }> {
  return llamarApi(`/api/responsables/${id}`, { method: 'DELETE' });
}
