// CRUD de usuarios ayudantes. Solo el tesorero accede a estos endpoints
// (lo garantiza requiereTesorero en la ruta). Según la especificación,
// el tesorero gestiona AYUDANTES: no se crean ni modifican tesoreros
// desde la API.

import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';

// Campos que la API devuelve de un usuario: NUNCA passwordHash.
const camposPublicos = {
  id: true,
  nombre: true,
  apellido: true,
  telefono: true,
  email: true,
  rol: true,
  estado: true,
} as const;

const RONDAS_BCRYPT = 10;

// GET /api/usuarios
export async function listarUsuarios(_req: Request, res: Response) {
  const usuarios = await prisma.usuario.findMany({
    select: camposPublicos,
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
  });
  res.json(usuarios);
}

// POST /api/usuarios — body: { nombre, apellido, telefono?, email, password }
export async function crearAyudante(req: Request, res: Response) {
  const { nombre, apellido, telefono, email, password } = req.body ?? {};

  if (!nombre || !apellido || !email || !password) {
    res.status(400).json({ error: 'Nombre, apellido, email y contraseña son obligatorios' });
    return;
  }
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    return;
  }

  try {
    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        apellido,
        telefono: telefono || null,
        email,
        passwordHash: await bcrypt.hash(password, RONDAS_BCRYPT),
        rol: 'AYUDANTE',
      },
      select: camposPublicos,
    });
    res.status(201).json(usuario);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      res.status(409).json({ error: `Ya existe un usuario con el email ${email}` });
      return;
    }
    throw e;
  }
}

// PUT /api/usuarios/:id — body: { nombre?, apellido?, telefono?, email?, password?, estado? }
export async function editarAyudante(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;
  const { nombre, apellido, telefono, email, password, estado } = req.body ?? {};

  const existente = await prisma.usuario.findUnique({ where: { id } });
  if (!existente) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }
  if (existente.rol === 'TESORERO') {
    res.status(403).json({ error: 'No se puede modificar un tesorero desde esta pantalla' });
    return;
  }
  if (estado !== undefined && estado !== 'ACTIVO' && estado !== 'INACTIVO') {
    res.status(400).json({ error: 'Estado inválido: debe ser ACTIVO o INACTIVO' });
    return;
  }
  if (password !== undefined && (typeof password !== 'string' || password.length < 8)) {
    res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    return;
  }

  try {
    const usuario = await prisma.usuario.update({
      where: { id },
      data: {
        nombre: nombre ?? undefined,
        apellido: apellido ?? undefined,
        telefono: telefono === undefined ? undefined : telefono || null,
        email: email ?? undefined,
        estado: estado ?? undefined,
        passwordHash: password ? await bcrypt.hash(password, RONDAS_BCRYPT) : undefined,
      },
      select: camposPublicos,
    });
    res.json(usuario);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      res.status(409).json({ error: `Ya existe un usuario con el email ${email}` });
      return;
    }
    throw e;
  }
}

// DELETE /api/usuarios/:id
// Los pagos/abonos que registró el usuario conservan el registro con
// registradoPor en nulo (SetNull en el schema).
export async function eliminarAyudante(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;

  const existente = await prisma.usuario.findUnique({ where: { id } });
  if (!existente) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }
  if (existente.rol === 'TESORERO') {
    res.status(403).json({ error: 'No se puede eliminar un tesorero desde esta pantalla' });
    return;
  }

  await prisma.usuario.delete({ where: { id } });
  res.json({ mensaje: 'Usuario eliminado' });
}
