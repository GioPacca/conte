// Llamadas al backend para pagos de cuota de actividad.
import { llamarApi } from './http';

export type Pago = {
  id: string;
  mes: number;
  anio: number;
  monto: string; // Decimal serializado como string
  fechaPago: string;
  observaciones: string | null;
  miembroId: string;
  miembro: {
    id: string;
    nombre: string;
    apellido: string;
    dni: string;
    responsable: { nombre: string; apellido: string } | null;
  };
  registradoPor: { nombre: string; apellido: string } | null;
};

export type DatosPago = {
  miembroId: string;
  meses: number[];
  anio: number;
  monto: number;
  fechaPago: string; // AAAA-MM-DD
  observaciones?: string;
};

export function listarPagos(filtros: {
  miembroId?: string;
  mes?: number;
  anio?: number;
  limite?: number;
}): Promise<Pago[]> {
  const params = new URLSearchParams();
  if (filtros.miembroId) params.set('miembroId', filtros.miembroId);
  if (filtros.mes) params.set('mes', String(filtros.mes));
  if (filtros.anio) params.set('anio', String(filtros.anio));
  if (filtros.limite) params.set('limite', String(filtros.limite));
  const query = params.toString();
  return llamarApi(`/api/pagos${query ? `?${query}` : ''}`);
}

// Devuelve UN pago creado por cada mes seleccionado
export function registrarPago(datos: DatosPago): Promise<Pago[]> {
  return llamarApi('/api/pagos', { method: 'POST', body: JSON.stringify(datos) });
}

export function editarPago(
  id: string,
  datos: Partial<Omit<DatosPago, 'miembroId' | 'meses'>> & { mes?: number }
): Promise<Pago> {
  return llamarApi(`/api/pagos/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
}
