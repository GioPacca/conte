// Genera la imagen PNG de un comprobante dibujando en un canvas y dispara
// la descarga. Compartido por los comprobantes de cuota y de abono.
// Los comprobantes NUNCA se almacenan (decisión 5 de la especificación).

import { formatearMonto } from './formato';

export type DatosComprobante = {
  subtitulo: string;            // "Comprobante de pago de cuota de actividad" / "... de abono de evento"
  filas: [string, string][];    // pares etiqueta/valor
  monto: string;                // Decimal como string
  observaciones: string | null;
  nombreArchivo: string;        // sin extensión
};

export function descargarComprobanteImagen(datos: DatosComprobante) {
  const ancho = 640;
  const alto = 120 + datos.filas.length * 52 + 70 + (datos.observaciones ? 60 : 0);
  const canvas = document.createElement('canvas');
  // Escala 2x para que la imagen descargada se vea nítida
  canvas.width = ancho * 2;
  canvas.height = alto * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(2, 2);

  // Fondo y borde
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.strokeStyle = '#d1d5db';
  ctx.strokeRect(0.5, 0.5, ancho - 1, alto - 1);

  // Encabezado
  ctx.fillStyle = '#047857'; // emerald-700
  ctx.fillRect(0, 0, ancho, 64);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('CONTE', 24, 40);
  ctx.font = '13px sans-serif';
  ctx.fillText(datos.subtitulo, 120, 39);

  // Cuerpo: pares etiqueta/valor
  let y = 104;
  for (const [etiqueta, valor] of datos.filas) {
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.fillText(etiqueta.toUpperCase(), 24, y);
    ctx.fillStyle = '#111827';
    ctx.font = '15px sans-serif';
    ctx.fillText(valor, 24, y + 20);
    y += 52;
  }

  // Monto destacado
  ctx.fillStyle = '#6b7280';
  ctx.font = '12px sans-serif';
  ctx.fillText('MONTO', 24, y);
  ctx.fillStyle = '#047857';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(formatearMonto(datos.monto), 24, y + 30);
  y += 62;

  // Observaciones (si hay), recortadas a dos líneas simples
  if (datos.observaciones) {
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.fillText('OBSERVACIONES', 24, y);
    ctx.fillStyle = '#111827';
    ctx.font = '13px sans-serif';
    const texto = datos.observaciones.length > 150
      ? datos.observaciones.slice(0, 150) + '…'
      : datos.observaciones;
    ctx.fillText(texto.slice(0, 75), 24, y + 18);
    if (texto.length > 75) ctx.fillText(texto.slice(75), 24, y + 34);
  }

  // Descargar
  const enlace = document.createElement('a');
  enlace.download = `${datos.nombreArchivo}.png`;
  enlace.href = canvas.toDataURL('image/png');
  enlace.click();
}
