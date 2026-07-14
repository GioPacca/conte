// Panel principal (pantalla 2): resume el estado del sistema en una
// sola llamada. Accesible para ambos roles.

import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const CANTIDAD_MOVIMIENTOS = 10;

// GET /api/panel
export async function obtenerPanel(_req: Request, res: Response) {
  const ahora = new Date();
  const mesActual = ahora.getMonth() + 1;
  const anioActual = ahora.getFullYear();

  const [totalMiembros, miembrosActivos, porRol, recaudacion, ultimosPagos, ultimosAbonos] =
    await Promise.all([
      prisma.miembro.count(),
      prisma.miembro.count({ where: { estado: 'ACTIVO' } }),
      prisma.miembro.groupBy({ by: ['rolMiembro'], _count: { _all: true } }),
      // Recaudación del mes calendario actual por cuota de actividad
      prisma.pagoCuotaActividad.aggregate({
        where: { mes: mesActual, anio: anioActual },
        _sum: { monto: true },
      }),
      prisma.pagoCuotaActividad.findMany({
        include: { miembro: { select: { nombre: true, apellido: true } } },
        orderBy: { fechaPago: 'desc' },
        take: CANTIDAD_MOVIMIENTOS,
      }),
      prisma.abonoEvento.findMany({
        include: {
          participante: {
            include: {
              miembro: { select: { nombre: true, apellido: true } },
              evento: { select: { nombre: true } },
            },
          },
        },
        orderBy: { fechaPago: 'desc' },
        take: CANTIDAD_MOVIMIENTOS,
      }),
    ]);

  // Cantidad por rol, siempre con los tres presentes
  const cantidadPorRol = { CONQUISTADOR: 0, LIDER: 0, DIRECTIVO: 0 };
  for (const grupo of porRol) {
    cantidadPorRol[grupo.rolMiembro] = grupo._count._all;
  }

  // Lista unificada de últimos movimientos (decisión 7): pagos de cuota
  // y abonos de evento juntos, ordenados por fecha de pago.
  const movimientos = [
    ...ultimosPagos.map((p) => ({
      id: p.id,
      tipo: 'CUOTA' as const,
      miembro: `${p.miembro.apellido}, ${p.miembro.nombre}`,
      detalle: { mes: p.mes, anio: p.anio },
      monto: p.monto,
      fechaPago: p.fechaPago,
    })),
    ...ultimosAbonos.map((a) => ({
      id: a.id,
      tipo: 'ABONO' as const,
      miembro: `${a.participante.miembro.apellido}, ${a.participante.miembro.nombre}`,
      detalle: { evento: a.participante.evento.nombre },
      monto: a.monto,
      fechaPago: a.fechaPago,
    })),
  ]
    .sort((a, b) => b.fechaPago.getTime() - a.fechaPago.getTime())
    .slice(0, CANTIDAD_MOVIMIENTOS);

  res.json({
    totalMiembros,
    miembrosActivos,
    cantidadPorRol,
    recaudacionMesActual: {
      mes: mesActual,
      anio: anioActual,
      total: (recaudacion._sum.monto ?? 0).toString(),
    },
    movimientos,
  });
}
