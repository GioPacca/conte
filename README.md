# CONTE — Tesorería del Club de Conquistadores

Sistema web de gestión de tesorería: miembros, responsables, pagos de cuota
de actividad, eventos y abonos de evento. La especificación funcional
completa está en [ESPECIFICACION.md](ESPECIFICACION.md).

## Stack

- **Frontend**: React + TypeScript + Tailwind CSS v4 + Vite.
- **Backend**: Node.js + Express + TypeScript.
- **ORM**: Prisma 7 (con driver adapter `@prisma/adapter-pg`).
- **Base de datos**: PostgreSQL en Supabase (solo como base de datos;
  sin Supabase Auth ni su API automática).
- **Autenticación**: propia — bcrypt + express-session (Etapa 1, pendiente).

## Estructura

```
conte/
├── backend/            → API Express + Prisma
│   ├── prisma.config.ts   → config de Prisma CLI (migraciones)
│   ├── prisma/            → schema.prisma y migraciones
│   └── src/
│       ├── index.ts       → servidor Express
│       └── lib/prisma.ts  → cliente Prisma único
└── frontend/           → app React (Vite)
    └── src/
        ├── pages/         → una por pantalla
        ├── components/    → piezas reutilizables
        └── api/           → funciones que llaman al backend
```

## Cómo correr el proyecto en desarrollo

Requisitos: Node.js 20+ y las credenciales de la base en Supabase.

1. **Backend**

   ```bash
   cd backend
   npm install
   cp .env.example .env   # completar con las URLs reales de Supabase
   npx prisma migrate dev # aplica migraciones pendientes
   npm run dev            # http://localhost:3000
   ```

2. **Frontend** (en otra terminal)

   ```bash
   cd frontend
   npm install
   npm run dev            # http://localhost:5173
   ```

   En desarrollo, Vite redirige `/api/*` al backend (puerto 3000), por lo
   que no hace falta configurar CORS ni URLs absolutas.

## Variables de entorno (backend/.env)

| Variable | Uso |
|---|---|
| `PORT` | Puerto del servidor Express (por defecto 3000). |
| `DATABASE_URL` | Conexión en runtime: pooler de Supabase en modo **transacción** (puerto 6543, `?pgbouncer=true`). |
| `DIRECT_URL` | Conexión para **migraciones**: pooler en modo **sesión** (puerto 5432). |

El `.env` nunca se sube al repositorio (está en `.gitignore`).

## Primer uso: crear el tesorero

La base arranca sin usuarios. El primer TESORERO se crea una única vez con:

```bash
cd backend
npm run crear-tesorero   # pide nombre, apellido, email y contraseña
```

El script se niega a correr si ya existe un tesorero. Los ayudantes se
crean después desde la aplicación (solo el tesorero puede).

## Endpoints

| Método | Ruta | Permisos | Descripción |
|---|---|---|---|
| GET | `/api/health` | público | Verifica que el servidor esté vivo. Respuesta: `{ "estado": "ok" }`. |
| POST | `/api/auth/login` | público | Body: `{ email, password }`. Inicia sesión (cookie). Respuesta: usuario sin hash. 401 si las credenciales fallan o el usuario está inactivo. |
| POST | `/api/auth/logout` | público | Cierra la sesión y borra la cookie. |
| GET | `/api/auth/yo` | sesión | Usuario de la sesión actual: `{ id, nombre, apellido, telefono, email, rol }`. |
| PUT | `/api/auth/perfil` | sesión | Cada usuario edita SU información: `{ nombre?, apellido?, telefono?, email?, passwordActual?, passwordNueva? }`. Cambiar la contraseña exige la actual (401 si no coincide). El rol y el estado no se tocan por acá. |
| GET | `/api/usuarios` | tesorero | Lista todos los usuarios (sin hash), ordenados por apellido. |
| POST | `/api/usuarios` | tesorero | Body: `{ nombre, apellido, telefono?, email, password, rol? }` — rol `AYUDANTE` (por defecto) o `TESORERO`. 409 si el email ya existe. |
| PUT | `/api/usuarios/:id` | tesorero | Body: campos a cambiar (`password` y `estado` incluidos). Solo ayudantes: 403 si el destino es tesorero. |
| DELETE | `/api/usuarios/:id` | tesorero | Elimina un ayudante o tesorero (nunca a uno mismo: 409). Sus pagos/abonos registrados quedan con `registradoPor` en nulo. |

| GET | `/api/responsables?busqueda=` | sesión | Lista responsables con `cantidadMiembros`. La búsqueda cubre nombre, apellido y DNI (insensible a mayúsculas). |
| GET | `/api/responsables/:id` | sesión | Detalle con la lista de `miembros` asociados. |
| POST | `/api/responsables` | sesión | Body: `{ nombre, apellido, dni, telefono?, tipoRelacion?, observaciones? }`. 409 si el DNI ya existe. |
| PUT | `/api/responsables/:id` | sesión | Body: campos a cambiar. 409 si el DNI ya existe. |
| DELETE | `/api/responsables/:id` | tesorero | Elimina el responsable; sus miembros quedan sin responsable (SetNull). |

| GET | `/api/miembros?busqueda=&unidad=&estado=&rol=` | sesión | Lista con responsable resumido. La búsqueda cubre nombre, apellido, DNI y nombre/apellido del responsable; los filtros se combinan. |
| GET | `/api/miembros/sin-pago?mes=&anio=&busqueda=&unidad=&estado=&rol=` | sesión | Miembros SIN registro de pago de cuota de actividad en el período. Mes y año obligatorios; acepta los mismos filtros que el listado. |
| GET | `/api/miembros/:id` | sesión | Detalle con datos completos del responsable. |
| POST | `/api/miembros` | sesión | Body: `{ nombre, apellido, dni, rolMiembro, telefono?, unidad?, estado?, responsableId?, observaciones? }`. Valida enums y que el responsable exista. 409 si el DNI ya existe. |
| PUT | `/api/miembros/:id` | sesión | Body: campos a cambiar (incluye `estado` y `responsableId`; vacío = quitar responsable). |
| DELETE | `/api/miembros/:id` | tesorero | Elimina el miembro y, en cascada, sus pagos, participaciones y abonos. |

| GET | `/api/pagos?miembroId=&mes=&anio=&limite=` | sesión | Lista pagos de cuota de actividad con miembro (y su responsable) y quién lo registró. Orden: más reciente primero. |
| POST | `/api/pagos` | sesión | Body: `{ miembroId, meses: number[], anio, monto, fechaPago, observaciones? }`. Crea UN pago por mes, todos con el mismo monto, en una transacción (todo o nada). Devuelve los pagos creados. 409 con detalle de períodos si alguno ya existe. |
| PUT | `/api/pagos/:id` | sesión | Body: `{ monto?, fechaPago?, mes?, anio?, observaciones? }`. 409 si el nuevo período ya tiene pago. |

| GET | `/api/eventos` | sesión | Lista de eventos con `cantidadParticipantes`, ordenados por fecha descendente. |
| GET | `/api/eventos/:id` | sesión | Detalle: datos, participantes (con miembro, `totalAbonado` e historial de abonos) y `totalRecaudado`. |
| POST | `/api/eventos` | tesorero | Body: `{ nombre, fecha, descripcion?, estado? }`. |
| PUT | `/api/eventos/:id` | tesorero | Body: campos a cambiar (incluye `estado`). |
| DELETE | `/api/eventos/:id` | tesorero | Elimina el evento y, en cascada, sus participantes y abonos. |
| POST | `/api/eventos/:id/participantes` | sesión | Body: `{ miembroId }`. 409 si ya participa o si el evento está inactivo. |
| DELETE | `/api/eventos/:id/participantes/:participanteId` | sesión | Quita al participante y elimina sus abonos (cascada). 409 si el evento está inactivo. |
| POST | `/api/abonos` | sesión | Body: `{ participanteId, monto, fechaPago, observaciones? }`. 409 si el evento está inactivo. Devuelve el abono con los datos del comprobante. |
| PUT | `/api/abonos/:id` | sesión | Body: `{ monto?, fechaPago?, observaciones? }`. |
| GET | `/api/configuracion` | sesión | Fila única: `{ nombreClub }`. Ambos roles la leen (la barra superior muestra el nombre del club). |
| PUT | `/api/configuracion` | tesorero | Body: `{ nombreClub }`. |
| POST | `/api/miembros/inactivar-todos` | tesorero | Cambio masivo: TODOS los miembros pasan a INACTIVO. No toca pagos ni historiales. Devuelve la cantidad afectada. |
| GET | `/api/cotizacion` | sesión | Dólar blue y oficial (compra/venta) desde dolarapi.com, con caché de 10 minutos. 502 si el servicio externo no responde. |
| GET | `/api/panel` | sesión | Resumen del panel principal: `totalMiembros`, `miembrosActivos`, `cantidadPorRol`, `recaudacionMesActual` (mes calendario) y `movimientos` (últimos 10, pagos y abonos unificados por fecha). |

El detalle de miembro (`GET /api/miembros/:id`) ahora incluye `pagos`
(su historial completo, del más reciente al más antiguo) y `eventos`
(eventos en los que participa, con el monto acumulado en cada uno).

Errores: siempre `{ "error": "mensaje" }` con el código HTTP correspondiente
(400 validación, 401 sin sesión / credenciales, 403 sin permiso,
404 no encontrado, 409 duplicado).

## Decisiones

- **Dos URLs de conexión a Supabase.** El pooler en modo transacción
  (puerto 6543) es el adecuado para la app en runtime, pero no soporta los
  comandos de migración de Prisma. Por eso `prisma.config.ts` (que solo lee
  la CLI) usa `DIRECT_URL` (modo sesión, puerto 5432), y el cliente en
  `src/lib/prisma.ts` usa `DATABASE_URL`.
- **Driver adapter obligatorio en Prisma 7.** `PrismaClient` ya no acepta
  una URL directa: requiere un adapter. Se usa `@prisma/adapter-pg` sobre
  `pg`, el adapter oficial para PostgreSQL.
- **Migración inicial por reset.** La base de validación ya tenía las tablas
  creadas sin historial de migraciones (drift). Se reseteó el schema
  (estaba vacío, salvo la fila única de `configuracion`, que se reinsertó
  idéntica) y se aplicó la migración `init` limpia. Desde ahora, todo cambio
  de schema pasa por `npx prisma migrate dev`.
- **Tailwind v4 vía plugin de Vite.** Se usa `@tailwindcss/vite`; no hay
  `tailwind.config` ni PostCSS. El CSS se activa con `@import "tailwindcss"`.
- **Proxy de desarrollo en Vite y rewrite de Vercel en producción.**
  El frontend llama siempre a rutas relativas `/api/...`: en desarrollo
  Vite las reenvía al backend local, y en producción Vercel las reenvía
  a Render (`vercel.json`). El navegador nunca cruza de dominio, por lo
  que NO hace falta CORS y la cookie de sesión sigue siendo de primera
  parte (`sameSite: lax`).
- **TypeScript estricto en ambos proyectos**, con `module: nodenext` en el
  backend (TS 7 eliminó la resolución `node` clásica).
- **La sesión guarda solo el id del usuario.** En cada request, el middleware
  relee el usuario de la base y verifica que siga ACTIVO: así las sesiones de
  un usuario inactivado o eliminado dejan de valer de inmediato, como exige
  la especificación. La sesión se regenera al loguear (evita fijación de sesión).
- **Sesiones en PostgreSQL** (`connect-pg-simple`, decidido en la Etapa 9):
  la tabla `session` se crea automáticamente y es de infraestructura —
  vive fuera del schema de Prisma a propósito. Las sesiones sobreviven a
  los reinicios del servidor y el logout las elimina de la base.
- **Primer tesorero por script de seed** (`npm run crear-tesorero`), no por
  endpoint: no estaba definido en la especificación y se decidió con el
  usuario. El CRUD de la API solo gestiona AYUDANTES: no crea ni modifica
  tesoreros.
- **Contraseña mínima de 8 caracteres** (no estaba en la especificación;
  criterio técnico mínimo). Hasheo con bcrypt (10 rondas). El campo
  `passwordHash` jamás sale en una respuesta de la API.
- **Mensaje de login genérico**: "Email o contraseña incorrectos" sin revelar
  cuál falló.
- **Navegación sin librería de router.** Con pocas pantallas, un estado
  simple en `App` + pestañas en el layout alcanza. Se reevaluará si el
  número de pantallas lo justifica.
- **La búsqueda es literal** (contains, insensible a mayúsculas): buscar
  "gonza" no encuentra "González" porque la á lleva tilde. Búsqueda sin
  acentos (unaccent) queda fuera del alcance por ahora.
- **Comprobantes multi-mes: uno por cada mes** (decidido con el usuario).
  Se generan en el navegador dibujando en un canvas y se descargan como PNG;
  nunca se almacenan (decisión 5 de la especificación).
- **El monto viaja como string.** Prisma serializa Decimal como string en
  JSON; el frontend lo formatea con `Intl` (es-AR, ARS) y nunca opera
  aritméticamente con él.
- **No hay eliminación de pagos.** La especificación solo define
  "modificar". Si hiciera falta borrar un pago, se decidirá como cambio
  de alcance.
- **Modificar pagos y abonos: cualquier usuario** (ampliación decidida
  con el usuario; la especificación lo limitaba al tesorero). Aplica a
  los dos endpoints `PUT` y a los botones "Editar": en el historial de
  pagos del detalle del miembro (edición en línea de mes/año/monto/fecha/
  observaciones) y en el historial de abonos del evento. Las validaciones
  no cambian: monto > 0, período único, evento inactivo solo consulta.
- **Prevención de duplicados en dos capas**: verificación previa con
  mensaje detallado (miembro + períodos exactos) y, si dos usuarios
  registran a la vez, el UNIQUE de la base corta la transacción entera.
- **El año por defecto en formularios y filtros es el del sistema.**
  La especificación definía `anio_actual` en la configuración (decisión 9),
  pero se eliminó después (decidido con el usuario): no restringía nada y
  el año calendario cumple el mismo rol sin mantenimiento manual. La
  migración `quitar_anio_actual` borra la columna. Ambos roles pueden LEER
  la configuración (la barra superior muestra el nombre del club); solo el
  tesorero la modifica.
- **La pestaña Configuración solo es visible para el tesorero** (y el
  backend rechaza igualmente cualquier modificación de un ayudante).
- **El tesorero puede CREAR y ELIMINAR otros tesoreros** (ampliación
  posterior a la especificación, decidida con el usuario): el selector de
  rol aparece solo al crear, con una advertencia sobre el poder total del
  rol. Nadie puede eliminarse a sí mismo — como quien ejecuta es un
  tesorero activo, siempre queda al menos uno. EDITAR tesoreros sigue
  bloqueado.
- **Cada usuario edita su propia información** (ampliación decidida con
  el usuario) desde "Mi perfil" (click en el nombre, en la barra
  superior): nombre, apellido, teléfono, email y contraseña. Cambiar la
  contraseña exige ingresar la actual (protege una sesión abierta ajena).
  El rol y el estado quedan fuera: son del tesorero.
- **"Mes actual" del panel = mes calendario del sistema.** Los "últimos
  movimientos" son los 10 más recientes por fecha de pago (no se registra
  hora de carga).
- **Sin eliminación de abonos** (igual que los pagos): la especificación
  solo define "modificar". Los abonos desaparecen por cascada al quitar
  al participante o eliminar el evento.
- **Totales calculados en el backend** (`totalAbonado` por participante,
  `totalRecaudado` por evento) y devueltos como string con dos decimales;
  el frontend solo formatea.
- **El dibujo de comprobantes está centralizado** en
  `frontend/src/lib/comprobanteImagen.ts`; los comprobantes de cuota y de
  abono comparten esa utilidad.
- **Cotización del dólar en el panel** (pedido posterior a la
  especificación): el navegador no puede leer sitios externos directamente
  (CORS), así que el backend consulta **dolarapi.com** (servicio JSON; se
  eligió sobre leer el HTML de dolarhoy.com por robustez, decidido con el
  usuario) y cachea el resultado 10 minutos en memoria. Si el servicio
  falla, la tarjeta muestra "no disponible" y el resto del panel funciona
  igual. El panel también lista los eventos ACTIVOS con su cantidad de
  participantes.

## Despliegue (Vercel + Render)

**Sistema en producción**: https://conte-ecru.vercel.app
(backend: https://conte-gxbw.onrender.com, solo API).

El frontend se despliega en **Vercel** y el backend en **Render**; la base
ya vive en Supabase. El navegador solo habla con Vercel: el archivo
`frontend/vercel.json` reenvía (`rewrite`) todas las llamadas `/api/*` al
backend en Render, así no hace falta CORS y la cookie de sesión es de
primera parte.

### 1. Backend en Render

1. Crear un **Web Service** apuntando al repositorio, con directorio raíz
   `backend/`.
2. Build command:
   `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   (las migraciones van dentro del build porque el plan gratuito de Render
   no permite pre-deploy commands).
3. Start command: `npm start`
4. Variables de entorno:
   - `DATABASE_URL` → pooler de transacción de Supabase (puerto 6543).
   - `DIRECT_URL` → pooler de sesión (puerto 5432, para las migraciones).
   - `SESSION_SECRET` → un secreto aleatorio NUEVO (no reutilizar el local).
   - `NODE_ENV` → `production` (activa trust proxy y cookie secure).
   - `PORT` la define Render automáticamente.

### 2. Frontend en Vercel

1. Editar `frontend/vercel.json`: reemplazar
   `https://CAMBIAR-POR-TU-BACKEND.onrender.com` por la URL real del
   servicio de Render.
2. Crear el proyecto en Vercel apuntando al repositorio, con directorio
   raíz `frontend/` (framework: Vite). Build y output quedan detectados
   automáticamente (`npm run build` → `dist/`).
3. No hacen falta variables de entorno en el frontend.

### 3. Primer uso en producción

Si la base de producción está vacía, correr el seed del tesorero una única
vez (desde una máquina con el `.env` de producción): `npm run crear-tesorero`.
En este despliegue no hizo falta: producción usa la misma base de Supabase
que el desarrollo, con el tesorero ya creado.

Nota del plan gratuito de Render: el servicio se duerme tras ~15 minutos
sin uso y la primera petición posterior tarda ~30-60 segundos. Las
sesiones NO se pierden (viven en PostgreSQL).

## Estado de las etapas

- ✅ **Etapa 0 — Fundaciones**: monorepo, migración inicial del schema a
  Supabase (8 tablas), backend Express base con `/api/health`, frontend
  Vite + Tailwind con layout base y verificación de conexión.
- ✅ **Etapa 1 — Autenticación y usuarios**: login/logout con
  express-session, middleware `requiereSesion` / `requiereTesorero`,
  CRUD de ayudantes, pantalla de Login y script del primer tesorero.
- ✅ **Etapa 2 — Responsables**: CRUD completo con búsqueda, detalle con
  miembros asociados y navegación entre pantallas en el frontend.
- ✅ **Etapa 3 — Miembros**: CRUD con búsqueda (incluye responsable),
  filtros por unidad/rol/estado, detalle y enums traducidos en la UI.
- ✅ **Etapa 4 — Pagos de cuota de actividad**: registro simple y
  multi-mes en transacción, modificación solo-tesorero, historial en el
  detalle del miembro y comprobantes descargables como imagen (uno por mes).
- ✅ **Etapa 5 — Miembros sin pago registrado**: consulta por mes+año en
  la pantalla de Miembros, combinable con todos los filtros existentes.
- ✅ **Etapa 6 — Eventos, participantes y abonos**: CRUD de eventos
  (solo tesorero), participantes y abonos con reglas de evento
  activo/inactivo, totales por participante y por evento, segundo flujo
  de la pantalla Pagos y comprobante de abono descargable.
- ✅ **Etapa 7 — Configuración**: nombre del club (solo tesorero),
  pantalla de gestión de usuarios y cambio masivo a inactivo. (El año
  actual configurable se eliminó después, a pedido del usuario: los
  formularios usan el año del sistema.)
- ✅ **Etapa 8 — Panel principal**: totales de miembros, cantidad por rol,
  recaudación del mes actual, últimos movimientos unificados y acceso
  rápido a registrar pago.
- ✅ **Etapa 9 — Validaciones finales, pruebas y despliegue**: sesiones
  en PostgreSQL (sobreviven reinicios), cookie secure + trust proxy para
  producción, rewrite de Vercel (sin CORS), builds de producción
  verificados y **sistema desplegado y verificado en
  https://conte-ecru.vercel.app** (frontend en Vercel, backend en Render,
  base en Supabase).
