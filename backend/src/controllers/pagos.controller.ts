// Pagos de cuota de actividad — el módulo central del sistema.
// Registrar: ambos roles. Modificar: solo tesorero (en la ruta).
// La especificación NO define eliminación de pagos: no se implementa.

import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function nombreMes(mes: number): string {
  return MESES_ES[mes - 1] ?? String(mes);
}

function esMesValido(m: unknown): m is number {
  return typeof m === 'number' && Number.isInteger(m) && m >= 1 && m <= 12;
}

function esAnioValido(a: unknown): a is number {
  return typeof a === 'number' && Number.isInteger(a) && a >= 2000 && a <= 2100;
}

// El monto llega como number o string numérico; debe ser > 0.
// Se devuelve como string para pasarlo a Decimal sin errores de flotante.
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

// Datos que se devuelven con cada pago (para listas y comprobantes)
const incluirRelaciones = {
  miembro: {
    select: {
      id: true,
      nombre: true,
      apellido: true,
      dni: true,
      responsable: { select: { nombre: true, apellido: true } },
    },
  },
  registradoPor: { select: { nombre: true, apellido: true } },
} as const;

// GET /api/pagos?miembroId=&mes=&anio=&limite=
export async function listarPagos(req: Request, res: Response) {
  const miembroId = typeof req.query.miembroId === 'string' ? req.query.miembroId : undefined;
  const mes = req.query.mes ? Number(req.query.mes) : undefined;
  const anio = req.query.anio ? Number(req.query.anio) : undefined;
  const limite = req.query.limite ? Number(req.query.limite) : undefined;

  const pagos = await prisma.pagoCuotaActividad.findMany({
    where: {
      miembroId,
      mes: mes && esMesValido(mes) ? mes : undefined,
      anio: anio && esAnioValido(anio) ? anio : undefined,
    },
    include: incluirRelaciones,
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { fechaPago: 'desc' }],
    take: limite && limite > 0 ? Math.min(limite, 100) : undefined,
  });

  res.json(pagos);
}

// POST /api/pagos — body: { miembroId, meses: number[], anio, monto, fechaPago, observaciones? }
// Multi-mes: UN registro por mes con el MISMO monto completo, en UNA
// transacción (todo o nada). Devuelve los pagos creados (un comprobante
// por cada uno, decisión tomada con el usuario).
export async function registrarPago(req: Request, res: Response) {
  const { miembroId, meses, anio, monto, fechaPago, observaciones } = req.body ?? {};

  if (!miembroId || typeof miembroId !== 'string') {
    res.status(400).json({ error: 'Falta el miembro' });
    return;
  }
  if (!Array.isArray(meses) || meses.length === 0) {
    res.status(400).json({ error: 'Seleccioná al menos un mes' });
    return;
  }
  if (!meses.every(esMesValido)) {
    res.status(400).json({ error: 'Mes inválido: debe estar entre 1 y 12' });
    return;
  }
  if (new Set(meses).size !== meses.length) {
    res.status(400).json({ error: 'Hay meses repetidos en la selección' });
    return;
  }
  if (!esAnioValido(anio)) {
    res.status(400).json({ error: 'Año inválido' });
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

  // El miembro puede estar INACTIVO: se permite registrar pagos igual (decisión 8)
  const miembro = await prisma.miembro.findUnique({ where: { id: miembroId } });
  if (!miembro) {
    res.status(400).json({ error: 'El miembro indicado no existe' });
    return;
  }

  // Verificación previa de duplicados para dar un mensaje claro
  const existentes = await prisma.pagoCuotaActividad.findMany({
    where: { miembroId, anio, mes: { in: meses } },
    select: { mes: true },
  });
  if (existentes.length > 0) {
    const periodos = existentes.map((p) => `${nombreMes(p.mes)} ${anio}`).join(', ');
    res.status(409).json({
      error: `${miembro.nombre} ${miembro.apellido} ya tiene pago registrado en: ${periodos}`,
    });
    return;
  }

  try {
    // UNA transacción: o se registran todos los meses o ninguno
    const pagos = await prisma.$transaction(
      (meses as number[]).map((mes) =>
        prisma.pagoCuotaActividad.create({
          data: {
            miembroId,
            mes,
            anio,
            monto: montoStr,
            fechaPago: fecha,
            observaciones: observaciones || null,
            registradoPorId: req.usuario!.id,
          },
          include: incluirRelaciones,
        })
      )
    );
    res.status(201).json(pagos);
  } catch (e) {
    // Carrera: otro usuario registró el mismo período entre la verificación y acá
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      res.status(409).json({
        error: `${miembro.nombre} ${miembro.apellido} ya tiene pago registrado en alguno de los períodos seleccionados`,
      });
      return;
    }
    throw e;
  }
}

// PUT /api/pagos/:id — solo tesorero.
// Modificables: monto, fechaPago, mes, anio, observaciones (sección 5).
export async function editarPago(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;
  const { monto, fechaPago, mes, anio, observaciones } = req.body ?? {};

  const existente = await prisma.pagoCuotaActividad.findUnique({
    where: { id },
    include: { miembro: { select: { nombre: true, apellido: true } } },
  });
  if (!existente) {
    res.status(404).json({ error: 'Pago no encontrado' });
    return;
  }

  if (mes !== undefined && !esMesValido(mes)) {
    res.status(400).json({ error: 'Mes inválido: debe estar entre 1 y 12' });
    return;
  }
  if (anio !== undefined && !esAnioValido(anio)) {
    res.status(400).json({ error: 'Año inválido' });
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

  try {
    const pago = await prisma.pagoCuotaActividad.update({
      where: { id },
      data: {
        monto: montoStr,
        fechaPago: fecha,
        mes: mes ?? undefined,
        anio: anio ?? undefined,
        observaciones: observaciones === undefined ? undefined : observaciones || null,
      },
      include: incluirRelaciones,
    });
    res.json(pago);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const mesFinal = (mes ?? existente.mes) as number;
      const anioFinal = (anio ?? existente.anio) as number;
      res.status(409).json({
        error: `${existente.miembro.nombre} ${existente.miembro.apellido} ya tiene pago registrado en ${nombreMes(mesFinal)} ${anioFinal}`,
      });
      return;
    }
    throw e;
  }
}
