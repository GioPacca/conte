// Lógica de autenticación: login, logout, consulta del usuario actual
// y edición del propio perfil.

import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';

// POST /api/auth/login - body: { email, password } 
// Acá se encarga de que se hallan completado los campos y que el usuario exista y esté activo.
export async function iniciarSesion(req: Request, res: Response) {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    return;
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });

  // Mismo mensaje si el email no existe o la contraseña es incorrecta:
  // no revelar cuál de los dos falló.
  if (!usuario || !(await bcrypt.compare(password, usuario.passwordHash))) {
    res.status(401).json({ error: 'Email o contraseña incorrectos' });
    return;
  }

  if (usuario.estado === 'INACTIVO') {
    res.status(401).json({ error: 'El usuario está inactivo' });
    return;
  }

  // Regenerar la sesión al loguear (evita fijación de sesión)
  req.session.regenerate((err) => {
    if (err) {
      res.status(500).json({ error: 'No se pudo iniciar la sesión' });
      return;
    }
    // Esto es lo que hace que la sesión "recuerde" al usuario.
    req.session.usuarioId = usuario.id;
    res.json({
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      telefono: usuario.telefono,
      email: usuario.email,
      rol: usuario.rol,
    });
  });
}

// POST /api/auth/logout
// Cierra la sesión actual y borra la cookie de sesión.
export function cerrarSesion(req: Request, res: Response) {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'No se pudo cerrar la sesión' });
      return;
    }
    res.clearCookie('connect.sid');
    res.json({ mensaje: 'Sesión cerrada' });
  });
}

// GET /api/auth/yo — usuario de la sesión actual (requiereSesion ya lo cargó)
export function usuarioActual(req: Request, res: Response) {
  res.json(req.usuario);
}

// PUT /api/auth/perfil - cada usuario edita su propia información
export async function editarPerfil(req: Request, res: Response) {
  const { nombre, apellido, telefono, email, passwordActual, passwordNueva } = req.body ?? {};

  if (nombre !== undefined && (typeof nombre !== 'string' || !nombre.trim())) {
    res.status(400).json({ error: 'El nombre no puede quedar vacío' });
    return;
  }
  if (apellido !== undefined && (typeof apellido !== 'string' || !apellido.trim())) {
    res.status(400).json({ error: 'El apellido no puede quedar vacío' });
    return;
  }
  if (email !== undefined && (typeof email !== 'string' || !email.trim())) {
    res.status(400).json({ error: 'El email no puede quedar vacío' });
    return;
  }

  let passwordHash: string | undefined;
  if (passwordNueva !== undefined) {
    if (typeof passwordNueva !== 'string' || passwordNueva.length < 8) {
      res.status(400).json({ error: 'La contraseña nueva debe tener al menos 8 caracteres' });
      return;
    }
    // Verificar la contraseña actual antes de permitir el cambio
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario!.id } });
    if (
      typeof passwordActual !== 'string' ||
      !usuario ||
      !(await bcrypt.compare(passwordActual, usuario.passwordHash))
    ) {
      res.status(401).json({ error: 'La contraseña actual es incorrecta' });
      return;
    }
    passwordHash = await bcrypt.hash(passwordNueva, 10);
  }

  try {
    const actualizado = await prisma.usuario.update({
      where: { id: req.usuario!.id },
      data: {
        nombre: nombre === undefined ? undefined : nombre.trim(),
        apellido: apellido === undefined ? undefined : apellido.trim(),
        telefono: telefono === undefined ? undefined : telefono || null,
        email: email === undefined ? undefined : email.trim(),
        passwordHash,
      },
      select: { id: true, nombre: true, apellido: true, telefono: true, email: true, rol: true },
    });
    res.json(actualizado);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      res.status(409).json({ error: `Ya existe un usuario con el email ${email}` });
      return;
    }
    throw e;
  }
}
