import { Router } from 'express';
import {
  listarEventos,
  obtenerEvento,
  crearEvento,
  editarEvento,
  eliminarEvento,
  agregarParticipante,
  quitarParticipante,
} from '../controllers/eventos.controller';
import { requiereSesion, requiereTesorero } from '../middleware/autenticacion';

export const rutasEventos = Router();

rutasEventos.use(requiereSesion);

// Ver eventos: ambos roles
rutasEventos.get('/', listarEventos);
rutasEventos.get('/:id', obtenerEvento);

// Crear/editar/eliminar eventos (incluye cambiar estado): solo tesorero
rutasEventos.post('/', requiereTesorero, crearEvento);
rutasEventos.put('/:id', requiereTesorero, editarEvento);
rutasEventos.delete('/:id', requiereTesorero, eliminarEvento);

// Participantes: ambos roles (el controller exige evento ACTIVO)
rutasEventos.post('/:id/participantes', agregarParticipante);
rutasEventos.delete('/:id/participantes/:participanteId', quitarParticipante);
