import { Router } from 'express';
import { iniciarSesion, cerrarSesion, usuarioActual } from '../controllers/auth.controller';
import { requiereSesion } from '../middleware/autenticacion';

export const rutasAuth = Router();

rutasAuth.post('/login', iniciarSesion);
rutasAuth.post('/logout', cerrarSesion);
rutasAuth.get('/yo', requiereSesion, usuarioActual);
