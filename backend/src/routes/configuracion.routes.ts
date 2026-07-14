import { Router } from 'express';
import { obtenerConfiguracion, editarConfiguracion } from '../controllers/configuracion.controller';
import { requiereSesion, requiereTesorero } from '../middleware/autenticacion';

export const rutasConfiguracion = Router();

rutasConfiguracion.use(requiereSesion);

// Leer: ambos roles (para los valores por defecto de los formularios)
rutasConfiguracion.get('/', obtenerConfiguracion);
// Modificar: solo tesorero (sección 3 de la especificación)
rutasConfiguracion.put('/', requiereTesorero, editarConfiguracion);
