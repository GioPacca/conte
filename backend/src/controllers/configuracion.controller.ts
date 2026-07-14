// Configuración del sistema: tabla de una sola fila (id = 1).
// Leer: ambos roles (la barra superior muestra el nombre del club).
// Modificar: solo tesorero.

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

// PUT /api/configuracion — solo tesorero. Body: { nombreClub }
export async function editarConfiguracion(req: Request, res: Response) {
  const { nombreClub } = req.body ?? {};

  if (typeof nombreClub !== 'string' || !nombreClub.trim()) {
    res.status(400).json({ error: 'El nombre del club no puede quedar vacío' });
    return;
  }

  const config = await prisma.configuracion.update({
    where: { id: 1 },
    data: { nombreClub: nombreClub.trim() },
  });
  res.json(config);
}
