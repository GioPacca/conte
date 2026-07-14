import { Router } from 'express';
import {
  listarMiembros,
  listarMiembrosSinPago,
  obtenerMiembro,
  crearMiembro,
  editarMiembro,
  eliminarMiembro,
  inactivarTodos,
} from '../controllers/miembros.controller';
import { requiereSesion, requiereTesorero } from '../middleware/autenticacion';

export const rutasMiembros = Router();

rutasMiembros.use(requiereSesion);

rutasMiembros.get('/', listarMiembros);
// Debe declararse ANTES de /:id para que "sin-pago" no se tome como un id
rutasMiembros.get('/sin-pago', listarMiembrosSinPago);
rutasMiembros.get('/:id', obtenerMiembro);
rutasMiembros.post('/', crearMiembro);
// Cambio masivo a inactivo: solo tesorero (sección 5 de la especificación)
rutasMiembros.post('/inactivar-todos', requiereTesorero, inactivarTodos);
rutasMiembros.put('/:id', editarMiembro);
// Eliminar es exclusivo del tesorero (sección 3 de la especificación)
rutasMiembros.delete('/:id', requiereTesorero, eliminarMiembro);
