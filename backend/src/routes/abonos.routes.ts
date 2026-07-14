import { Router } from 'express';
import { registrarAbono, editarAbono } from '../controllers/abonos.controller';
import { requiereSesion } from '../middleware/autenticacion';

export const rutasAbonos = Router();

rutasAbonos.use(requiereSesion);

rutasAbonos.post('/', registrarAbono);
// Modificar abonos: cualquier usuario (ampliación decidida con el usuario;
// la especificación lo limitaba al tesorero).
rutasAbonos.put('/:id', editarAbono);
