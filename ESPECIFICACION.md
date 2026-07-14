# CONTE — Especificación funcional y técnica

Sistema web de gestión de tesorería para un Club de Conquistadores.
Versión B. Este documento consolida el documento funcional original MÁS todas
las decisiones tomadas en la revisión de diseño. Ante contradicción con
cualquier otra fuente, vale este documento.

---

## 1. Objetivo

Herramienta simple para que el equipo de tesorería administre: miembros,
responsables, pagos de cuota de actividad, eventos, abonos de eventos,
usuarios internos y consultas financieras simples.

Principios: claridad, practicidad, facilidad de uso y mantenimiento.
CONTE NO maneja deudas ni saldos pendientes: registra pagos y permite
consultar quiénes no tienen registro de pago en un mes/año dado. La
interpretación de casos especiales queda a criterio del equipo de tesorería.

## 2. Stack tecnológico (decidido)

- Frontend: React + TypeScript + Tailwind CSS + Vite.
- Backend: Node.js + Express + TypeScript.
- ORM: Prisma (v7 — la URL de conexión vive en prisma.config.ts + .env).
- Base de datos: PostgreSQL hosteado en Supabase (Supabase se usa SOLO como
  base de datos; NO se usa Supabase Auth ni su API automática).
- Autenticación: propia en el backend — bcrypt para hashear contraseñas,
  express-session con cookies para la sesión.
- Estructura: monorepo (carpetas backend/ y frontend/).
- Despliegue: frontend en Vercel/Netlify, backend en Render/Railway.

## 3. Usuarios y permisos

Dos roles: TESORERO (administrador) y AYUDANTE (operativo).

| Acción | Tesorero | Ayudante |
|---|---|---|
| Crear/editar/eliminar usuarios ayudantes | ✔ | ✘ |
| Crear/editar miembros | ✔ | ✔ |
| Eliminar miembros | ✔ | ✘ |
| Marcar miembros activos/inactivos | ✔ | ✔ |
| Crear/editar responsables | ✔ | ✔ |
| Eliminar responsables | ✔ | ✘ |
| Registrar pagos de cuota de actividad | ✔ | ✔ |
| Modificar registros de pago | ✔ | ✘ |
| Registrar abonos de evento | ✔ | ✔ |
| Modificar abonos de evento | ✔ | ✘ |
| Crear/editar/eliminar eventos (incluye cambiar estado) | ✔ | ✘ |
| Ver eventos | ✔ | ✔ |
| Agregar/quitar participantes de eventos | ✔ | ✔ |
| Cambiar configuración del sistema | ✔ | ✘ |
| Cambio masivo de miembros a inactivo | ✔ | ✘ |
| Consultas (miembros, pagos, eventos, sin-pago) | ✔ | ✔ |

Reglas de usuarios:
- Login con email + contraseña. Email único.
- Usuario INACTIVO no puede iniciar sesión (y sus sesiones dejan de valer).
- Si se elimina un usuario, los pagos/abonos que registró conservan el
  registro pero con la referencia registradoPor en nulo.

## 4. Modelo de datos (YA VALIDADO — implementado en schema.prisma)

8 tablas. Ver backend/prisma/schema.prisma como fuente de verdad estructural.

- usuarios: id, nombre, apellido, telefono?, email (único), password_hash,
  rol (TESORERO/AYUDANTE), estado (ACTIVO/INACTIVO).
- responsables: id, nombre, apellido, dni (único, obligatorio), telefono?,
  tipo_relacion?, observaciones?.
- miembros: id, nombre, apellido, dni (único, obligatorio), telefono?,
  unidad? (AMIGO/COMPANERO/EXPLORADOR/PIONERO/EXCURSIONISTA/GUIA),
  rol_miembro (CONQUISTADOR/LIDER/DIRECTIVO), estado, responsable_id?
  (SetNull al eliminar responsable), observaciones?.
- pagos_cuota_actividad: id, miembro_id (Cascade), mes, anio,
  monto Decimal(12,2), fecha_pago, registrado_por_id? (SetNull),
  observaciones?. UNIQUE(miembro_id, mes, anio).
- eventos: id, nombre, descripcion?, fecha, estado (ACTIVO/INACTIVO).
- evento_participantes: id, evento_id (Cascade), miembro_id (Cascade),
  fecha_asignacion. UNIQUE(evento_id, miembro_id).
- abonos_evento: id, participante_id → evento_participantes (Cascade),
  monto Decimal(12,2), fecha_pago, registrado_por_id? (SetNull),
  observaciones?. El abono apunta al PARTICIPANTE: imposible abonar sin
  participar; quitar participante elimina sus abonos.
- configuracion: fila única (id=1), nombre_club, anio_actual.

Cascadas confirmadas (comportamiento intencional, documentar al usuario final):
- Eliminar miembro → borra sus pagos, participaciones y abonos.
- Eliminar evento → borra participantes y abonos del evento.
- Quitar participante → borra sus abonos de ese evento.
- Eliminar responsable → sus miembros quedan sin responsable (SetNull).
- Eliminar usuario → registrado_por queda nulo en pagos/abonos.

## 5. Reglas de negocio (las que van en código backend)

Pagos de cuota de actividad:
- Terminología uniforme: "pago de cuota de actividad" siempre.
- Monto manual en cada pago; sin cuota fija, sin monto por rol, sin deudas.
- Mes válido: 1 a 12 (validar en backend; Prisma no soporta CHECK).
- Monto > 0.
- Multi-mes: si se seleccionan varios meses, crear UN registro por mes,
  con el MISMO monto completo en cada uno, en UNA transacción (todo o nada).
  El campo del formulario se llama "Monto por cada mes seleccionado".
- La violación del UNIQUE (miembro, mes, año) debe devolver un mensaje
  claro indicando miembro y período duplicado.
- Se permite registrar pagos a miembros INACTIVOS (decisión 8).
- Solo el tesorero modifica pagos (monto, fecha, mes, año, observaciones).
  Sin historial de cambios en esta versión.

Consulta de miembros sin pago:
- Seleccionando mes + año, listar miembros SIN registro de pago en ese
  período. Nunca usar la palabra "debe": son "sin registro de pago".
- Filtros: dni, nombre del miembro, nombre del responsable, estado,
  unidad, rol, mes, año.
- Sin interpretación automática de ingresos tardíos.

Eventos y abonos:
- Evento ACTIVO: admite agregar/quitar participantes y registrar abonos.
- Evento INACTIVO: solo consulta. Rechazar abonos y cambios de participantes.
- Abonos libres: sin deuda, sin saldo, sin monto objetivo.
- Un miembro puede tener varios abonos en el mismo evento; mostrar total
  acumulado por miembro y total recaudado por evento.
- Se permiten abonos de miembros INACTIVOS (si participan del evento).
- Monto > 0. Solo tesorero modifica abonos (monto, fecha, observaciones).

Comprobantes (decisión 5):
- NO se almacenan. Tras registrar un pago/abono se muestra en pantalla un
  resumen con botón para descargarlo como imagen.
- Comprobante de cuota: miembro, responsable (o "Sin responsable asociado"),
  fecha de pago, mes y año, MONTO (decisión 4), observación.
- Comprobante de abono: miembro, responsable (o "Sin responsable asociado"),
  evento, fecha de pago, monto, observación.
- En pagos multi-mes: un comprobante por cada mes registrado (o un resumen
  que liste los meses — decidir en la etapa 4 con el usuario).

Configuración:
- nombre_club y anio_actual editables solo por tesorero.
- anio_actual es SOLO el valor por defecto en formularios y filtros; no
  restringe nada (decisión 9). No se actualiza automáticamente.
- Cambio masivo a inactivo: botón solo-tesorero, con confirmación previa;
  pone estado=INACTIVO a TODOS los miembros; no toca pagos ni historiales.

## 6. Pantallas (frontend)

1. Login.
2. Panel principal: total miembros activos, total miembros, cantidad por rol
   (Conquistador/Líder/Directivo), recaudación del mes actual por cuota de
   actividad, lista unificada de últimos movimientos (pagos de cuota y abonos
   de evento juntos — decisión 7), acceso rápido a registrar pago.
3. Miembros: tabla, búsqueda (nombre/apellido/responsable/DNI), filtros
   (unidad/estado/rol), selector mes+año para ver quiénes no tienen pago,
   alta de miembro, acceso a detalle.
4. Detalle de miembro: datos, responsable, historial de pagos de cuota,
   eventos en los que participa con monto acumulado en cada uno,
   observaciones, editar, registrar pago.
5. Responsables: tabla, búsqueda, miembros asociados, alta, detalle.
6. Pagos: dos flujos — registrar pago de cuota de actividad (miembro,
   mes/es, año, monto por cada mes, fecha, observaciones) y registrar abono
   de evento (evento activo, miembro participante, monto, fecha,
   observaciones).
7. Eventos: lista (nombre, fecha, estado, cantidad de participantes),
   crear/editar/eliminar (solo tesorero), detalle.
8. Detalle de evento: datos, participantes (nombre, dni, teléfono, rol,
   unidad, total abonado, historial de abonos individual), historial de
   abonos del evento, agregar/quitar participante, registrar abono,
   editar/eliminar (solo tesorero).
9. Configuración: nombre del club, año actual, gestión de ayudantes,
   botón de cambio masivo a inactivo con confirmación.

Los enums se muestran traducidos: COMPANERO→Compañero, LIDER→Líder,
GUIA→Guía, etc.

## 7. Alcance EXCLUIDO (no implementar)

Cálculo de deudas o saldos; valores automáticos de cuota o por rol;
trazabilidad de modificaciones; historial de responsables anteriores;
reglas para ingresos tardíos; reactivación compleja de miembros; permisos
avanzados; reportes contables avanzados.

## 8. Etapas de desarrollo

Ver CLAUDE.md. Etapa actual al crear este documento: Etapa 0 (fundaciones).
El schema.prisma ya está diseñado y validado; falta la migración inicial
contra Supabase y los esqueletos de backend y frontend.
