import { Router } from 'express';
import { obtenerPanel } from '../controllers/panel.controller';
import { requiereSesion } from '../middleware/autenticacion';

export const rutasPanel = Router();

rutasPanel.get('/', requiereSesion, obtenerPanel);
