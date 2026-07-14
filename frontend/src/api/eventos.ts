// Llamadas al backend para eventos, participantes y abonos.
import { llamarApi } from './http';
import type { Unidad, RolMiembro, Estado } from '../lib/traducciones';

export type Evento = {
  id: string;
  nombre: string;
  descripcion: string | null;
  fecha: string;
  estado: Estado;
};

export type EventoEnLista = Evento & { cantidadParticipantes: number };

export type AbonoDeParticipante = {
  id: string;
  monto: string; // Decimal como string
  fechaPago: string;
  observaciones: string | null;
  registradoPor: { nombre: string; apellido: string } | null;
};

export type Participante = {
  id: string;
  fechaAsignacion: string;
  miembro: {
    id: string;
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string | null;
    rolMiembro: RolMiembro;
    unidad: Unidad | null;
    estado: Estado;
    responsable: { nombre: string; apellido: string } | null;
  };
  abonos: AbonoDeParticipante[];
  totalAbonado: string;
};

export type EventoDetalle = Evento & {
  participantes: Participante[];
  totalRecaudado: string;
};

// Abono completo (respuesta al registrar, para el comprobante)
export type Abono = AbonoDeParticipante & {
  participante: {
    id: string;
    miembro: {
      id: string;
      nombre: string;
      apellido: string;
      dni: string;
      responsable: { nombre: string; apellido: string } | null;
    };
    evento: { id: string; nombre: string; fecha: string };
  };
};

export type DatosEvento = {
  nombre: string;
  descripcion?: string;
  fecha: string; // AAAA-MM-DD
  estado?: string;
};

export function listarEventos(): Promise<EventoEnLista[]> {
  return llamarApi('/api/eventos');
}

export function obtenerEvento(id: string): Promise<EventoDetalle> {
  return llamarApi(`/api/eventos/${id}`);
}

export function crearEvento(datos: DatosEvento): Promise<Evento> {
  return llamarApi('/api/eventos', { method: 'POST', body: JSON.stringify(datos) });
}

export function editarEvento(id: string, datos: Partial<DatosEvento>): Promise<Evento> {
  return llamarApi(`/api/eventos/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
}

export function eliminarEvento(id: string): Promise<{ mensaje: string }> {
  return llamarApi(`/api/eventos/${id}`, { method: 'DELETE' });
}

export function agregarParticipante(eventoId: string, miembroId: string) {
  return llamarApi(`/api/eventos/${eventoId}/participantes`, {
    method: 'POST',
    body: JSON.stringify({ miembroId }),
  });
}

export function quitarParticipante(eventoId: string, participanteId: string): Promise<{ mensaje: string }> {
  return llamarApi(`/api/eventos/${eventoId}/participantes/${participanteId}`, {
    method: 'DELETE',
  });
}

export function registrarAbono(datos: {
  participanteId: string;
  monto: number;
  fechaPago: string;
  observaciones?: string;
}): Promise<Abono> {
  return llamarApi('/api/abonos', { method: 'POST', body: JSON.stringify(datos) });
}

export function editarAbono(
  id: string,
  datos: { monto?: number; fechaPago?: string; observaciones?: string }
): Promise<Abono> {
  return llamarApi(`/api/abonos/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
}
