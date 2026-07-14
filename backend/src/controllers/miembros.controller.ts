// CRUD de miembros del club.
// Crear, editar y cambiar estado: ambos roles. Eliminar: solo tesorero.

import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

const UNIDADES = ['AMIGO', 'COMPANERO', 'EXPLORADOR', 'PIONERO', 'EXCURSIONISTA', 'GUIA'];
const ROLES_MIEMBRO = ['CONQUISTADOR', 'LIDER', 'DIRECTIVO'];
const ESTADOS = ['ACTIVO', 'INACTIVO'];

// Valida los campos de entrada comunes a crear y editar.
// Devuelve el mensaje de error, o null si todo está bien.
function validarCampos(body: Record<string, unknown>, esEdicion: boolean): string | null {
  const { nombre, apellido, dni, unidad, rolMiembro, estado } = body;

  if (!esEdicion && (!nombre || !apellido || !dni || !rolMiembro)) {
    return 'Nombre, apellido, DNI y rol son obligatorios';
  }
  if (esEdicion && dni !== undefined && !String(dni).trim()) {
    return 'El DNI no puede quedar vacío';
  }
  if (unidad !== undefined && unidad !== null && unidad !== '' && !UNIDADES.includes(unidad as string)) {
    return 'Unidad inválida';
  }
  if (rolMiembro !== undefined && !ROLES_MIEMBRO.includes(rolMiembro as string)) {
    return 'Rol de miembro inválido';
  }
  if (estado !== undefined && !ESTADOS.includes(estado as string)) {
    return 'Estado inválido: debe ser ACTIVO o INACTIVO';
  }
  return null;
}

// Arma el `where` de Prisma a partir de los query params comunes
// (búsqueda + filtros). Lo comparten el listado y la consulta sin-pago.
function armarFiltros(query: Request['query']) {
  const busqueda = typeof query.busqueda === 'string' ? query.busqueda.trim() : '';
  const unidad = typeof query.unidad === 'string' && UNIDADES.includes(query.unidad) ? query.unidad : undefined;
  const estado = typeof query.estado === 'string' && ESTADOS.includes(query.estado) ? query.estado : undefined;
  const rol = typeof query.rol === 'string' && ROLES_MIEMBRO.includes(query.rol) ? query.rol : undefined;

  return {
    unidad: unidad as never,
    estado: estado as never,
    rolMiembro: rol as never,
    ...(busqueda
      ? {
          OR: [
            { nombre: { contains: busqueda, mode: 'insensitive' as const } },
            { apellido: { contains: busqueda, mode: 'insensitive' as const } },
            { dni: { contains: busqueda } },
            { responsable: { nombre: { contains: busqueda, mode: 'insensitive' as const } } },
            { responsable: { apellido: { contains: busqueda, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };
}

// GET /api/miembros?busqueda=&unidad=&estado=&rol=
// La búsqueda cubre nombre, apellido, DNI y nombre/apellido del responsable.
export async function listarMiembros(req: Request, res: Response) {
  const miembros = await prisma.miembro.findMany({
    where: armarFiltros(req.query),
    include: {
      responsable: { select: { id: true, nombre: true, apellido: true } },
    },
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
  });

  res.json(miembros);
}

// GET /api/miembros/sin-pago?mes=&anio=&busqueda=&unidad=&estado=&rol=
// Miembros SIN registro de pago de cuota de actividad en el período dado.
// Terminología: nunca "deben" — son "sin registro de pago" (sección 5).
// Sin interpretación de ingresos tardíos: la lectura queda a criterio
// del equipo de tesorería.
export async function listarMiembrosSinPago(req: Request, res: Response) {
  const mes = Number(req.query.mes);
  const anio = Number(req.query.anio);

  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    res.status(400).json({ error: 'Mes inválido: debe estar entre 1 y 12' });
    return;
  }
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    res.status(400).json({ error: 'Año inválido' });
    return;
  }

  const miembros = await prisma.miembro.findMany({
    where: {
      ...armarFiltros(req.query),
      pagos: { none: { mes, anio } },
    },
    include: {
      responsable: { select: { id: true, nombre: true, apellido: true } },
    },
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
  });

  res.json(miembros);
}

// GET /api/miembros/:id — detalle con responsable, historial de pagos de
// cuota de actividad y eventos en los que participa con monto acumulado.
export async function obtenerMiembro(req: Request<{ id: string }>, res: Response) {
  const miembro = await prisma.miembro.findUnique({
    where: { id: req.params.id },
    include: {
      responsable: {
        select: { id: true, nombre: true, apellido: true, dni: true, telefono: true, tipoRelacion: true },
      },
      pagos: {
        include: { registradoPor: { select: { nombre: true, apellido: true } } },
        orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
      },
      participaciones: {
        include: {
          evento: { select: { id: true, nombre: true, fecha: true, estado: true } },
          abonos: { select: { monto: true } },
        },
      },
    },
  });

  if (!miembro) {
    res.status(404).json({ error: 'Miembro no encontrado' });
    return;
  }

  // Monto acumulado por evento (pantalla 4 de la especificación)
  const { participaciones, ...datos } = miembro;
  const eventos = participaciones.map((p) => ({
    participanteId: p.id,
    evento: p.evento,
    totalAbonado: p.abonos.reduce((suma, a) => suma + Number(a.monto), 0).toFixed(2),
  }));

  res.json({ ...datos, eventos });
}

// POST /api/miembros — body: { nombre, apellido, dni, telefono?, unidad?,
//   rolMiembro, estado?, responsableId?, observaciones? }
export async function crearMiembro(req: Request, res: Response) {
  const body = req.body ?? {};
  const errorValidacion = validarCampos(body, false);
  if (errorValidacion) {
    res.status(400).json({ error: errorValidacion });
    return;
  }

  const { nombre, apellido, dni, telefono, unidad, rolMiembro, estado, responsableId, observaciones } = body;

  if (responsableId) {
    const responsable = await prisma.responsable.findUnique({ where: { id: responsableId } });
    if (!responsable) {
      res.status(400).json({ error: 'El responsable indicado no existe' });
      return;
    }
  }

  try {
    const miembro = await prisma.miembro.create({
      data: {
        nombre,
        apellido,
        dni: String(dni).trim(),
        telefono: telefono || null,
        unidad: unidad || null,
        rolMiembro,
        estado: estado ?? undefined,
        responsableId: responsableId || null,
        observaciones: observaciones || null,
      },
      include: { responsable: { select: { id: true, nombre: true, apellido: true } } },
    });
    res.status(201).json(miembro);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      res.status(409).json({ error: `Ya existe un miembro con el DNI ${dni}` });
      return;
    }
    throw e;
  }
}

// PUT /api/miembros/:id — body: campos a cambiar (incluye estado y responsableId)
export async function editarMiembro(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;
  const body = req.body ?? {};

  const existente = await prisma.miembro.findUnique({ where: { id } });
  if (!existente) {
    res.status(404).json({ error: 'Miembro no encontrado' });
    return;
  }

  const errorValidacion = validarCampos(body, true);
  if (errorValidacion) {
    res.status(400).json({ error: errorValidacion });
    return;
  }

  const { nombre, apellido, dni, telefono, unidad, rolMiembro, estado, responsableId, observaciones } = body;

  // responsableId: undefined = no tocar; '' o null = quitar responsable
  if (responsableId) {
    const responsable = await prisma.responsable.findUnique({ where: { id: responsableId } });
    if (!responsable) {
      res.status(400).json({ error: 'El responsable indicado no existe' });
      return;
    }
  }

  try {
    const miembro = await prisma.miembro.update({
      where: { id },
      data: {
        nombre: nombre ?? undefined,
        apellido: apellido ?? undefined,
        dni: dni === undefined ? undefined : String(dni).trim(),
        telefono: telefono === undefined ? undefined : telefono || null,
        unidad: unidad === undefined ? undefined : unidad || null,
        rolMiembro: rolMiembro ?? undefined,
        estado: estado ?? undefined,
        responsableId: responsableId === undefined ? undefined : responsableId || null,
        observaciones: observaciones === undefined ? undefined : observaciones || null,
      },
      include: { responsable: { select: { id: true, nombre: true, apellido: true } } },
    });
    res.json(miembro);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      res.status(409).json({ error: `Ya existe un miembro con el DNI ${dni}` });
      return;
    }
    throw e;
  }
}

// POST /api/miembros/inactivar-todos — solo tesorero.
// Cambio masivo: pone estado=INACTIVO a TODOS los miembros. No toca
// pagos ni historiales (sección 5). La confirmación es responsabilidad
// de la UI; acá se ejecuta directo.
export async function inactivarTodos(_req: Request, res: Response) {
  const resultado = await prisma.miembro.updateMany({
    where: { estado: 'ACTIVO' },
    data: { estado: 'INACTIVO' },
  });
  res.json({
    mensaje: `Se marcaron ${resultado.count} miembros como inactivos.`,
    cantidad: resultado.count,
  });
}

// DELETE /api/miembros/:id — solo tesorero.
// La cascada borra sus pagos, participaciones y abonos (intencional).
export async function eliminarMiembro(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;

  const existente = await prisma.miembro.findUnique({ where: { id } });
  if (!existente) {
    res.status(404).json({ error: 'Miembro no encontrado' });
    return;
  }

  await prisma.miembro.delete({ where: { id } });
  res.json({
    mensaje: 'Miembro eliminado, junto con sus pagos, participaciones y abonos.',
  });
}
