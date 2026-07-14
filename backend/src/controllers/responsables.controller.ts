// CRUD de responsables (adultos a cargo de miembros).
// Crear y editar: ambos roles. Eliminar: solo tesorero (en la ruta).

import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

// GET /api/responsables?busqueda=texto
// La búsqueda cubre nombre, apellido y DNI (sección 6, pantalla 5).
export async function listarResponsables(req: Request, res: Response) {
  const busqueda = typeof req.query.busqueda === 'string' ? req.query.busqueda.trim() : '';

  const responsables = await prisma.responsable.findMany({
    where: busqueda
      ? {
          OR: [
            { nombre: { contains: busqueda, mode: 'insensitive' } },
            { apellido: { contains: busqueda, mode: 'insensitive' } },
            { dni: { contains: busqueda } },
          ],
        }
      : undefined,
    include: { _count: { select: { miembros: true } } },
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
  });

  res.json(
    responsables.map(({ _count, ...r }) => ({ ...r, cantidadMiembros: _count.miembros }))
  );
}

// GET /api/responsables/:id — detalle con miembros asociados
export async function obtenerResponsable(req: Request<{ id: string }>, res: Response) {
  const responsable = await prisma.responsable.findUnique({
    where: { id: req.params.id },
    include: {
      miembros: {
        select: { id: true, nombre: true, apellido: true, dni: true, estado: true },
        orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
      },
    },
  });

  if (!responsable) {
    res.status(404).json({ error: 'Responsable no encontrado' });
    return;
  }
  res.json(responsable);
}

// POST /api/responsables — body: { nombre, apellido, dni, telefono?, tipoRelacion?, observaciones? }
export async function crearResponsable(req: Request, res: Response) {
  const { nombre, apellido, dni, telefono, tipoRelacion, observaciones } = req.body ?? {};

  if (!nombre || !apellido || !dni) {
    res.status(400).json({ error: 'Nombre, apellido y DNI son obligatorios' });
    return;
  }

  try {
    const responsable = await prisma.responsable.create({
      data: {
        nombre,
        apellido,
        dni: String(dni).trim(),
        telefono: telefono || null,
        tipoRelacion: tipoRelacion || null,
        observaciones: observaciones || null,
      },
    });
    res.status(201).json(responsable);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      res.status(409).json({ error: `Ya existe un responsable con el DNI ${dni}` });
      return;
    }
    throw e;
  }
}

// PUT /api/responsables/:id — body: campos a cambiar
export async function editarResponsable(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;
  const { nombre, apellido, dni, telefono, tipoRelacion, observaciones } = req.body ?? {};

  const existente = await prisma.responsable.findUnique({ where: { id } });
  if (!existente) {
    res.status(404).json({ error: 'Responsable no encontrado' });
    return;
  }
  if (dni !== undefined && !String(dni).trim()) {
    res.status(400).json({ error: 'El DNI no puede quedar vacío' });
    return;
  }

  try {
    const responsable = await prisma.responsable.update({
      where: { id },
      data: {
        nombre: nombre ?? undefined,
        apellido: apellido ?? undefined,
        dni: dni === undefined ? undefined : String(dni).trim(),
        telefono: telefono === undefined ? undefined : telefono || null,
        tipoRelacion: tipoRelacion === undefined ? undefined : tipoRelacion || null,
        observaciones: observaciones === undefined ? undefined : observaciones || null,
      },
    });
    res.json(responsable);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      res.status(409).json({ error: `Ya existe un responsable con el DNI ${dni}` });
      return;
    }
    throw e;
  }
}

// DELETE /api/responsables/:id — solo tesorero.
// Sus miembros quedan sin responsable (SetNull en el schema).
export async function eliminarResponsable(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;

  const existente = await prisma.responsable.findUnique({ where: { id } });
  if (!existente) {
    res.status(404).json({ error: 'Responsable no encontrado' });
    return;
  }

  await prisma.responsable.delete({ where: { id } });
  res.json({ mensaje: 'Responsable eliminado. Sus miembros quedaron sin responsable asociado.' });
}
