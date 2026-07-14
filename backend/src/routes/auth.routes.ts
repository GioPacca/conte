import { Router } from 'express';
import { iniciarSesion, cerrarSesion, usuarioActual, editarPerfil } from '../controllers/auth.controller';
import { requiereSesion } from '../middleware/autenticacion';

export const rutasAuth = Router();

rutasAuth.post('/login', iniciarSesion);
rutasAuth.post('/logout', cerrarSesion);
rutasAuth.get('/yo', requiereSesion, usuarioActual);
// Cada usuario (cualquier rol) edita su propia información
rutasAuth.put('/perfil', requiereSesion, editarPerfil);
