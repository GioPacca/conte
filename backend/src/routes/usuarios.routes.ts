import { Router } from 'express';
import {
  listarUsuarios,
  crearAyudante,
  editarAyudante,
  eliminarAyudante,
} from '../controllers/usuarios.controller';
import { requiereSesion, requiereTesorero } from '../middleware/autenticacion';

export const rutasUsuarios = Router();

// Todo el CRUD de ayudantes es exclusivo del tesorero
rutasUsuarios.use(requiereSesion, requiereTesorero);

rutasUsuarios.get('/', listarUsuarios);
rutasUsuarios.post('/', crearAyudante);
rutasUsuarios.put('/:id', editarAyudante);
rutasUsuarios.delete('/:id', eliminarAyudante);
