// Abonos de evento.
// Registrar: ambos roles (solo en eventos ACTIVOS). Modificar: solo
// tesorero (monto, fecha, observaciones — sección 5). Sin eliminación
// (la especificación no la define; los abonos se van con el participante
// o el evento por cascada).

import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

function montoValido(m: unknown): string | null {
  const n = typeof m === 'number' ? m : typeof m === 'string' ? Number(m) : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  return String(m);
}

function fechaValida(f: unknown): Date | null {
  if (typeof f !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(f)) return null;
  const fecha = new Date(`${f}T00:00:00Z`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

// Datos que se devuelven con cada abono (para el comprobante)
const incluirRelaciones = {
  participante: {
    include: {
      miembro: {
        select: {
          id: true, nombre: true, apellido: true, dni: true,
          responsable: { select: { nombre: true, apellido: true } },
        },
      },
      evento: { select: { id: true, nombre: true, fecha: true } },
    },
  },
  registradoPor: { select: { nombre: true, apellido: true } },
} as const;

// POST /api/abonos — body: { participanteId, monto, fechaPago, observaciones? }
// El abono apunta al PARTICIPANTE: imposible abonar sin participar.
// Se permiten abonos de miembros INACTIVOS si participan del evento.
export async function registrarAbono(req: Request, res: Response) {
  const { participanteId, monto, fechaPago, observaciones } = req.body ?? {};

  if (!participanteId || typeof participanteId !== 'string') {
    res.status(400).json({ error: 'Falta el participante' });
    return;
  }
  const montoStr = montoValido(monto);
  if (!montoStr) {
    res.status(400).json({ error: 'El monto debe ser mayor a cero' });
    return;
  }
  const fecha = fechaValida(fechaPago);
  if (!fecha) {
    res.status(400).json({ error: 'Fecha de pago inválida (formato AAAA-MM-DD)' });
    return;
  }

  const participante = await prisma.eventoParticipante.findUnique({
    where: { id: participanteId },
    include: { evento: { select: { estado: true } } },
  });
  if (!participante) {
    res.status(400).json({ error: 'El participante indicado no existe' });
    return;
  }
  // Evento INACTIVO: solo consulta — rechazar abonos (sección 5)
  if (participante.evento.estado === 'INACTIVO') {
    res.status(409).json({ error: 'El evento está inactivo: no admite abonos' });
    return;
  }

  const abono = await prisma.abonoEvento.create({
    data: {
      participanteId,
      monto: montoStr,
      fechaPago: fecha,
      observaciones: observaciones || null,
      registradoPorId: req.usuario!.id,
    },
    include: incluirRelaciones,
  });
  res.status(201).json(abono);
}

// PUT /api/abonos/:id — solo tesorero. Modificables: monto, fecha, observaciones.
export async function editarAbono(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;
  const { monto, fechaPago, observaciones } = req.body ?? {};

  const existente = await prisma.abonoEvento.findUnique({ where: { id } });
  if (!existente) {
    res.status(404).json({ error: 'Abono no encontrado' });
    return;
  }

  let montoStr: string | undefined;
  if (monto !== undefined) {
    const valido = montoValido(monto);
    if (!valido) {
      res.status(400).json({ error: 'El monto debe ser mayor a cero' });
      return;
    }
    montoStr = valido;
  }
  let fecha: Date | undefined;
  if (fechaPago !== undefined) {
    const valida = fechaValida(fechaPago);
    if (!valida) {
      res.status(400).json({ error: 'Fecha de pago inválida (formato AAAA-MM-DD)' });
      return;
    }
    fecha = valida;
  }

  const abono = await prisma.abonoEvento.update({
    where: { id },
    data: {
      monto: montoStr,
      fechaPago: fecha,
      observaciones: observaciones === undefined ? undefined : observaciones || null,
    },
    include: incluirRelaciones,
  });
  res.json(abono);
}
