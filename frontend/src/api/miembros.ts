// Llamadas al backend para miembros.
import { llamarApi } from './http';
import type { Unidad, RolMiembro, Estado } from '../lib/traducciones';

export type Miembro = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string | null;
  unidad: Unidad | null;
  rolMiembro: RolMiembro;
  estado: Estado;
  responsableId: string | null;
  observaciones: string | null;
  responsable: { id: string; nombre: string; apellido: string } | null;
};

// Pago dentro del historial del miembro
export type PagoDeMiembro = {
  id: string;
  mes: number;
  anio: number;
  monto: string; // Decimal serializado como string
  fechaPago: string;
  observaciones: string | null;
  registradoPor: { nombre: string; apellido: string } | null;
};

// Evento en el que participa el miembro, con su monto acumulado
export type EventoDeMiembro = {
  participanteId: string;
  evento: { id: string; nombre: string; fecha: string; estado: Estado };
  totalAbonado: string;
};

// El detalle trae más datos del responsable, el historial de pagos
// y los eventos en los que participa
export type MiembroDetalle = Omit<Miembro, 'responsable'> & {
  responsable: {
    id: string;
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string | null;
    tipoRelacion: string | null;
  } | null;
  pagos: PagoDeMiembro[];
  eventos: EventoDeMiembro[];
};

export type FiltrosMiembros = {
  busqueda?: string;
  unidad?: string;
  estado?: string;
  rol?: string;
};

export type DatosMiembro = {
  nombre: string;
  apellido: string;
  dni: string;
  telefono?: string;
  unidad?: string;   // '' = sin unidad
  rolMiembro: string;
  estado?: string;
  responsableId?: string; // '' = sin responsable
  observaciones?: string;
};

export function listarMiembros(filtros: FiltrosMiembros): Promise<Miembro[]> {
  const params = new URLSearchParams();
  if (filtros.busqueda) params.set('busqueda', filtros.busqueda);
  if (filtros.unidad) params.set('unidad', filtros.unidad);
  if (filtros.estado) params.set('estado', filtros.estado);
  if (filtros.rol) params.set('rol', filtros.rol);
  const query = params.toString();
  return llamarApi(`/api/miembros${query ? `?${query}` : ''}`);
}

// Miembros SIN registro de pago de cuota de actividad en mes+año.
// Acepta los mismos filtros que el listado.
export function listarMiembrosSinPago(
  mes: number,
  anio: number,
  filtros: FiltrosMiembros
): Promise<Miembro[]> {
  const params = new URLSearchParams({ mes: String(mes), anio: String(anio) });
  if (filtros.busqueda) params.set('busqueda', filtros.busqueda);
  if (filtros.unidad) params.set('unidad', filtros.unidad);
  if (filtros.estado) params.set('estado', filtros.estado);
  if (filtros.rol) params.set('rol', filtros.rol);
  return llamarApi(`/api/miembros/sin-pago?${params}`);
}

export function obtenerMiembro(id: string): Promise<MiembroDetalle> {
  return llamarApi(`/api/miembros/${id}`);
}

export function crearMiembro(datos: DatosMiembro): Promise<Miembro> {
  return llamarApi('/api/miembros', { method: 'POST', body: JSON.stringify(datos) });
}

export function editarMiembro(id: string, datos: Partial<DatosMiembro>): Promise<Miembro> {
  return llamarApi(`/api/miembros/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
}

export function eliminarMiembro(id: string): Promise<{ mensaje: string }> {
  return llamarApi(`/api/miembros/${id}`, { method: 'DELETE' });
}
