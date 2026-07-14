// Cotización del dólar desde dolarapi.com (servicio JSON gratuito,
// pedido del usuario — fuera de la especificación original).
// Se cachea en memoria 10 minutos para no consultar el servicio en cada
// visita al panel. Si el servicio no responde, se devuelve 502 y la
// tarjeta del panel muestra "no disponible" sin romperse.

import type { Request, Response } from 'express';

type ValoresDolar = { compra: number; venta: number };

type Cotizacion = {
  fuente: string;
  actualizado: string; // ISO
  blue: ValoresDolar;
  oficial: ValoresDolar;
};

const DIEZ_MINUTOS = 10 * 60 * 1000;
let cache: { datos: Cotizacion; expira: number } | null = null;

async function pedirDolar(casa: 'blue' | 'oficial'): Promise<ValoresDolar> {
  const respuesta = await fetch(`https://dolarapi.com/v1/dolares/${casa}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!respuesta.ok) throw new Error(`dolarapi respondió ${respuesta.status}`);
  const datos = (await respuesta.json()) as { compra?: unknown; venta?: unknown };
  const compra = Number(datos.compra);
  const venta = Number(datos.venta);
  if (!Number.isFinite(compra) || !Number.isFinite(venta)) {
    throw new Error(`Respuesta inesperada de dolarapi para ${casa}`);
  }
  return { compra, venta };
}

// GET /api/cotizacion
export async function obtenerCotizacion(_req: Request, res: Response) {
  if (cache && cache.expira > Date.now()) {
    res.json(cache.datos);
    return;
  }

  try {
    const [blue, oficial] = await Promise.all([pedirDolar('blue'), pedirDolar('oficial')]);
    const datos: Cotizacion = {
      fuente: 'dolarapi.com',
      actualizado: new Date().toISOString(),
      blue,
      oficial,
    };
    cache = { datos, expira: Date.now() + DIEZ_MINUTOS };
    res.json(datos);
  } catch (e) {
    console.error('Error al consultar dolarapi.com:', e);
    res.status(502).json({ error: 'Cotización no disponible en este momento' });
  }
}
