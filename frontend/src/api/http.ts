// Utilidad base para llamar al backend.
// Todas las funciones de src/api/ usan esta; acá se centraliza el manejo
// de credenciales (cookies de sesión) y de errores.

export async function llamarApi<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(ruta, {
    // Incluir cookies: la sesión de express-session viaja en una cookie
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opciones.headers },
    ...opciones,
  });

  if (!respuesta.ok) {
    // El backend responde errores como { error: "mensaje" }
    const cuerpo = await respuesta.json().catch(() => null);
    throw new Error(cuerpo?.error ?? `Error ${respuesta.status}`);
  }

  return respuesta.json();
}
