// Utilidades de formato compartidas: meses, moneda y fechas.

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function nombreMes(mes: number): string {
  return MESES[mes - 1] ?? String(mes);
}

// El monto llega del backend como string (Decimal). Se muestra como moneda.
export function formatearMonto(monto: string | number): string {
  const n = typeof monto === 'string' ? Number(monto) : monto;
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
}

// Fecha AAAA-MM-DD (del backend o de un input date) → DD/MM/AAAA
export function formatearFecha(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

// La fecha de hoy en formato AAAA-MM-DD (para inputs date)
export function hoyISO(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}
