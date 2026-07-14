import { Router } from 'express';
import { obtenerCotizacion } from '../controllers/cotizacion.controller';
import { requiereSesion } from '../middleware/autenticacion';

export const rutasCotizacion = Router();

rutasCotizacion.get('/', requiereSesion, obtenerCotizacion);
