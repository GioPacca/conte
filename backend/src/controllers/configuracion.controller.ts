// Configuración del sistema: tabla de una sola fila (id = 1).
// Leer: ambos roles (los formularios usan anio_actual como valor por
// defecto). Modificar: solo tesorero.
// anio_actual NO restringe nada ni se actualiza solo (decisión 9).

import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// GET /api/configuracion
export async function obtenerConfiguracion(_req: Request, res: Response) {
  const config = await prisma.configuracion.findUnique({ where: { id: 1 } });
  if (!config) {
    // La fila única debería existir desde la instalación; si no, avisar claro
    res.status(500).json({ error: 'Falta la fila de configuración en la base' });
    return;
  }
  res.json(config);
}

// PUT /api/configuracion — solo tesorero. Body: { nombreClub?, anioActual? }
export async function editarConfiguracion(req: Request, res: Response) {
  const { nombreClub, anioActual } = req.body ?? {};

  if (nombreClub !== undefined && (typeof nombreClub !== 'string' || !nombreClub.trim())) {
    res.status(400).json({ error: 'El nombre del club no puede quedar vacío' });
    return;
  }
  if (
    anioActual !== undefined &&
    (!Number.isInteger(anioActual) || anioActual < 2000 || anioActual > 2100)
  ) {
    res.status(400).json({ error: 'Año inválido' });
    return;
  }

  const config = await prisma.configuracion.update({
    where: { id: 1 },
    data: {
      nombreClub: nombreClub === undefined ? undefined : nombreClub.trim(),
      anioActual: anioActual ?? undefined,
    },
  });
  res.json(config);
}
