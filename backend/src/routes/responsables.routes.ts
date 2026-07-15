import { Router } from 'express';
import {
  listarResponsables,
  obtenerResponsable,
  crearResponsable,
  editarResponsable,
  eliminarResponsable,
} from '../controllers/responsables.controller';
import { requiereSesion } from '../middleware/autenticacion';

export const rutasResponsables = Router();

rutasResponsables.use(requiereSesion);

rutasResponsables.get('/', listarResponsables);
rutasResponsables.get('/:id', obtenerResponsable);
rutasResponsables.post('/', crearResponsable);
rutasResponsables.put('/:id', editarResponsable);
// Eliminar: cualquier usuario (ampliación decidida con el usuario; la
// especificación lo limitaba al tesorero).
rutasResponsables.delete('/:id', eliminarResponsable);
