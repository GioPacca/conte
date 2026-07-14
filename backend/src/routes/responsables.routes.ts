import { Router } from 'express';
import {
  listarResponsables,
  obtenerResponsable,
  crearResponsable,
  editarResponsable,
  eliminarResponsable,
} from '../controllers/responsables.controller';
import { requiereSesion, requiereTesorero } from '../middleware/autenticacion';

export const rutasResponsables = Router();

rutasResponsables.use(requiereSesion);

rutasResponsables.get('/', listarResponsables);
rutasResponsables.get('/:id', obtenerResponsable);
rutasResponsables.post('/', crearResponsable);
rutasResponsables.put('/:id', editarResponsable);
// Eliminar es exclusivo del tesorero (sección 3 de la especificación)
rutasResponsables.delete('/:id', requiereTesorero, eliminarResponsable);
