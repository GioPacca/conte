// Traducción de los enums de la base a texto para mostrar.
// Los enums no admiten tildes ni ñ (sección 6 de la especificación):
// acá se convierten a su forma correcta en español.

export type Unidad = 'AMIGO' | 'COMPANERO' | 'EXPLORADOR' | 'PIONERO' | 'EXCURSIONISTA' | 'GUIA';
export type RolMiembro = 'CONQUISTADOR' | 'LIDER' | 'DIRECTIVO';
export type Estado = 'ACTIVO' | 'INACTIVO';

export const UNIDADES: Record<Unidad, string> = {
  AMIGO: 'Amigo',
  COMPANERO: 'Compañero',
  EXPLORADOR: 'Explorador',
  PIONERO: 'Pionero',
  EXCURSIONISTA: 'Excursionista',
  GUIA: 'Guía',
};

export const ROLES_MIEMBRO: Record<RolMiembro, string> = {
  CONQUISTADOR: 'Conquistador',
  LIDER: 'Líder',
  DIRECTIVO: 'Directivo',
};

export const ESTADOS: Record<Estado, string> = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
};

export function traducirUnidad(u: Unidad | null): string {
  return u ? UNIDADES[u] : '—';
}

export function traducirRol(r: RolMiembro): string {
  return ROLES_MIEMBRO[r];
}

export function traducirEstado(e: Estado): string {
  return ESTADOS[e];
}
