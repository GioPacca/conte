import { Router } from 'express';
import { registrarAbono, editarAbono } from '../controllers/abonos.controller';
import { requiereSesion, requiereTesorero } from '../middleware/autenticacion';

export const rutasAbonos = Router();

rutasAbonos.use(requiereSesion);

rutasAbonos.post('/', registrarAbono);
// Modificar abonos es exclusivo del tesorero (sección 3 de la especificación)
rutasAbonos.put('/:id', requiereTesorero, editarAbono);
