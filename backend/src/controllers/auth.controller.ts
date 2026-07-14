// Lógica de autenticación: login, logout y consulta del usuario actual.

import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';

// POST /api/auth/login — body: { email, password }
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
    req.session.usuarioId = usuario.id;
    res.json({
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol,
    });
  });
}

// POST /api/auth/logout
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
