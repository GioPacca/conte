import { Router } from 'express';
import { listarPagos, registrarPago, editarPago } from '../controllers/pagos.controller';
import { requiereSesion, requiereTesorero } from '../middleware/autenticacion';

export const rutasPagos = Router();

rutasPagos.use(requiereSesion);

rutasPagos.get('/', listarPagos);
rutasPagos.post('/', registrarPago);
// Modificar pagos es exclusivo del tesorero (sección 3 de la especificación)
rutasPagos.put('/:id', requiereTesorero, editarPago);
