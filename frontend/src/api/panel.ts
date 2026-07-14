// Llamada al backend para el panel principal.
import { llamarApi } from './http';

export type Movimiento = {
  id: string;
  tipo: 'CUOTA' | 'ABONO';
  miembro: string; // "Apellido, Nombre"
  detalle: { mes?: number; anio?: number; evento?: string };
  monto: string; // Decimal como string
  fechaPago: string;
};

export type EventoActivo = {
  id: string;
  nombre: string;
  fecha: string;
  cantidadParticipantes: number;
};

export type Panel = {
  totalMiembros: number;
  miembrosActivos: number;
  cantidadPorRol: { CONQUISTADOR: number; LIDER: number; DIRECTIVO: number };
  recaudacionMesActual: { mes: number; anio: number; total: string };
  movimientos: Movimiento[];
  eventosActivos: EventoActivo[];
};

export function obtenerPanel(): Promise<Panel> {
  return llamarApi('/api/panel');
}
