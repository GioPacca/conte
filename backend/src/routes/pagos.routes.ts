import { Router } from 'express';
import { listarPagos, registrarPago, editarPago } from '../controllers/pagos.controller';
import { requiereSesion } from '../middleware/autenticacion';

export const rutasPagos = Router();

rutasPagos.use(requiereSesion);

rutasPagos.get('/', listarPagos);
rutasPagos.post('/', registrarPago);
// Modificar pagos: cualquier usuario (ampliación decidida con el usuario;
// la especificación lo limitaba al tesorero).
rutasPagos.put('/:id', editarPago);
