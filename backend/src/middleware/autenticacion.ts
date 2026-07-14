// Middleware de autenticación y permisos.
// La sesión guarda SOLO el id del usuario; el resto se lee de la base en
// cada request. Así, si un usuario pasa a INACTIVO (o se elimina), sus
// sesiones existentes dejan de valer de inmediato (regla de la sección 3).

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// El tipo del usuario que viaja en req.usuario: NUNCA incluye passwordHash.
export type UsuarioSesion = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: 'TESORERO' | 'AYUDANTE';
};

declare module 'express-session' {
  interface SessionData {
    usuarioId?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioSesion;
    }
  }
}

// Exige sesión iniciada y usuario ACTIVO. Carga req.usuario.
export async function requiereSesion(req: Request, res: Response, next: NextFunction) {
  const usuarioId = req.session.usuarioId;
  if (!usuarioId) {
    res.status(401).json({ error: 'No hay sesión iniciada' });
    return;
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, nombre: true, apellido: true, email: true, rol: true, estado: true },
  });

  // Usuario eliminado o inactivo: la sesión deja de valer
  if (!usuario || usuario.estado === 'INACTIVO') {
    req.session.destroy(() => {});
    res.status(401).json({ error: 'La sesión ya no es válida' });
    return;
  }

  const { estado, ...usuarioSinEstado } = usuario;
  req.usuario = usuarioSinEstado;
  next();
}

// Exige rol TESORERO. Usar siempre DESPUÉS de requiereSesion.
export function requiereTesorero(req: Request, res: Response, next: NextFunction) {
  if (req.usuario?.rol !== 'TESORERO') {
    res.status(403).json({ error: 'Acción permitida solo al tesorero' });
    return;
  }
  next();
}
