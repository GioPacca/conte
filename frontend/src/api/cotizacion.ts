// Cotización del dólar (el backend la lee de dolarhoy.com y la cachea).
import { llamarApi } from './http';

export type Cotizacion = {
  fuente: string;
  actualizado: string; // ISO
  blue: { compra: number; venta: number };
  oficial: { compra: number; venta: number };
};

export function obtenerCotizacion(): Promise<Cotizacion> {
  return llamarApi('/api/cotizacion');
}
