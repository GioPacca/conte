// Eventos y participantes.
// Ver eventos: ambos roles. Crear/editar/eliminar (incluye cambiar estado):
// solo tesorero. Agregar/quitar participantes: ambos roles, solo si el
// evento está ACTIVO.

import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

function fechaValida(f: unknown): Date | null {
  if (typeof f !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(f)) return null;
  const fecha = new Date(`${f}T00:00:00Z`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

// GET /api/eventos — lista: nombre, fecha, estado, cantidad de participantes
export async function listarEventos(_req: Request, res: Response) {
  const eventos = await prisma.evento.findMany({
    include: { _count: { select: { participantes: true } } },
    orderBy: { fecha: 'desc' },
  });
  res.json(
    eventos.map(({ _count, ...e }) => ({ ...e, cantidadParticipantes: _count.participantes }))
  );
}

// GET /api/eventos/:id — detalle: datos, participantes con total abonado
// e historial individual, y total recaudado del evento.
export async function obtenerEvento(req: Request<{ id: string }>, res: Response) {
  const evento = await prisma.evento.findUnique({
    where: { id: req.params.id },
    include: {
      participantes: {
        include: {
          miembro: {
            select: {
              id: true, nombre: true, apellido: true, dni: true, telefono: true,
              rolMiembro: true, unidad: true, estado: true,
              responsable: { select: { nombre: true, apellido: true } },
            },
          },
          abonos: {
            include: { registradoPor: { select: { nombre: true, apellido: true } } },
            orderBy: { fechaPago: 'desc' },
          },
        },
        orderBy: { fechaAsignacion: 'asc' },
      },
    },
  });

  if (!evento) {
    res.status(404).json({ error: 'Evento no encontrado' });
    return;
  }

  // Totales calculados en el backend: acumulado por participante y del evento.
  // Los montos Decimal llegan como objetos; se suman como números (12,2 entra
  // sin pérdida en un double) y se devuelven como string.
  let totalEvento = 0;
  const participantes = evento.participantes.map((p) => {
    const total = p.abonos.reduce((suma, a) => suma + Number(a.monto), 0);
    totalEvento += total;
    return { ...p, totalAbonado: total.toFixed(2) };
  });

  res.json({ ...evento, participantes, totalRecaudado: totalEvento.toFixed(2) });
}

// POST /api/eventos — solo tesorero. Body: { nombre, descripcion?, fecha, estado? }
export async function crearEvento(req: Request, res: Response) {
  const { nombre, descripcion, fecha, estado } = req.body ?? {};

  if (!nombre) {
    res.status(400).json({ error: 'El nombre del evento es obligatorio' });
    return;
  }
  const fechaEvento = fechaValida(fecha);
  if (!fechaEvento) {
    res.status(400).json({ error: 'Fecha inválida (formato AAAA-MM-DD)' });
    return;
  }
  if (estado !== undefined && estado !== 'ACTIVO' && estado !== 'INACTIVO') {
    res.status(400).json({ error: 'Estado inválido: debe ser ACTIVO o INACTIVO' });
    return;
  }

  const evento = await prisma.evento.create({
    data: {
      nombre,
      descripcion: descripcion || null,
      fecha: fechaEvento,
      estado: estado ?? undefined,
    },
  });
  res.status(201).json(evento);
}

// PUT /api/eventos/:id — solo tesorero. Incluye cambiar estado.
export async function editarEvento(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;
  const { nombre, descripcion, fecha, estado } = req.body ?? {};

  const existente = await prisma.evento.findUnique({ where: { id } });
  if (!existente) {
    res.status(404).json({ error: 'Evento no encontrado' });
    return;
  }
  let fechaEvento: Date | undefined;
  if (fecha !== undefined) {
    const valida = fechaValida(fecha);
    if (!valida) {
      res.status(400).json({ error: 'Fecha inválida (formato AAAA-MM-DD)' });
      return;
    }
    fechaEvento = valida;
  }
  if (estado !== undefined && estado !== 'ACTIVO' && estado !== 'INACTIVO') {
    res.status(400).json({ error: 'Estado inválido: debe ser ACTIVO o INACTIVO' });
    return;
  }

  const evento = await prisma.evento.update({
    where: { id },
    data: {
      nombre: nombre ?? undefined,
      descripcion: descripcion === undefined ? undefined : descripcion || null,
      fecha: fechaEvento,
      estado: estado ?? undefined,
    },
  });
  res.json(evento);
}

// DELETE /api/eventos/:id — solo tesorero.
// La cascada borra participantes y abonos del evento (intencional).
export async function eliminarEvento(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;

  const existente = await prisma.evento.findUnique({ where: { id } });
  if (!existente) {
    res.status(404).json({ error: 'Evento no encontrado' });
    return;
  }

  await prisma.evento.delete({ where: { id } });
  res.json({ mensaje: 'Evento eliminado, junto con sus participantes y abonos.' });
}

// POST /api/eventos/:id/participantes — ambos roles. Body: { miembroId }
// Solo si el evento está ACTIVO (regla 11.5 / sección 5).
export async function agregarParticipante(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;
  const { miembroId } = req.body ?? {};

  const evento = await prisma.evento.findUnique({ where: { id } });
  if (!evento) {
    res.status(404).json({ error: 'Evento no encontrado' });
    return;
  }
  if (evento.estado === 'INACTIVO') {
    res.status(409).json({ error: 'El evento está inactivo: no admite cambios de participantes' });
    return;
  }
  if (!miembroId || typeof miembroId !== 'string') {
    res.status(400).json({ error: 'Falta el miembro' });
    return;
  }
  const miembro = await prisma.miembro.findUnique({ where: { id: miembroId } });
  if (!miembro) {
    res.status(400).json({ error: 'El miembro indicado no existe' });
    return;
  }

  try {
    const participante = await prisma.eventoParticipante.create({
      data: { eventoId: id, miembroId },
      include: {
        miembro: { select: { nombre: true, apellido: true, dni: true } },
      },
    });
    res.status(201).json(participante);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      res.status(409).json({
        error: `${miembro.nombre} ${miembro.apellido} ya participa de este evento`,
      });
      return;
    }
    throw e;
  }
}

// DELETE /api/eventos/:id/participantes/:participanteId — ambos roles.
// Solo si el evento está ACTIVO. La cascada elimina los abonos del
// participante (decisión 3, intencional).
export async function quitarParticipante(
  req: Request<{ id: string; participanteId: string }>,
  res: Response
) {
  const { id, participanteId } = req.params;

  const evento = await prisma.evento.findUnique({ where: { id } });
  if (!evento) {
    res.status(404).json({ error: 'Evento no encontrado' });
    return;
  }
  if (evento.estado === 'INACTIVO') {
    res.status(409).json({ error: 'El evento está inactivo: no admite cambios de participantes' });
    return;
  }

  const participante = await prisma.eventoParticipante.findUnique({ where: { id: participanteId } });
  if (!participante || participante.eventoId !== id) {
    res.status(404).json({ error: 'Participante no encontrado en este evento' });
    return;
  }

  await prisma.eventoParticipante.delete({ where: { id: participanteId } });
  res.json({ mensaje: 'Participante quitado del evento, junto con sus abonos.' });
}
