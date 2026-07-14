# CONTE — Reglas de trabajo para Claude Code

CONTE es un sistema web de gestión de tesorería para un Club de Conquistadores.
La especificación completa del sistema está en `ESPECIFICACION.md` — leela antes
de cualquier tarea. Es la fuente de verdad de las decisiones funcionales.

## Dinámica de trabajo (OBLIGATORIA)

- Desarrollo modular y progresivo: nunca generar más de un módulo o etapa por vez.
- Antes de crear código, explicar brevemente: qué se va a construir, por qué,
  y qué reglas de negocio intervienen.
- Después de crear o modificar archivos, explicar qué hace cada uno.
- Detenerse y pedir confirmación del usuario antes de pasar a la siguiente etapa.
- Hacer preguntas de comprensión: "¿Se entiende esta parte?", "¿Avanzamos?".
- NO inventar decisiones funcionales. Si algo no está definido en
  ESPECIFICACION.md, marcarlo como pendiente y proponer opciones claras.
- Mantener el sistema simple: no agregar librerías, capas ni abstracciones
  que la especificación no requiera.

## Convenciones de código

- Todo en TypeScript estricto (backend y frontend).
- Comentarios en español, solo donde aporten claridad.
- Nombres de variables y funciones en español (coherente con el dominio):
  `registrarPago`, `miembrosSinPago`, etc.
- Terminología uniforme: siempre "pago de cuota de actividad" y "abono de
  evento" — nunca sinónimos.
- Base de datos en snake_case (via @map), código en camelCase.
- Nunca usar Float para dinero: siempre Decimal.
- Las contraseñas SIEMPRE hasheadas con bcrypt. Nunca en texto plano,
  nunca en logs, nunca en respuestas de la API.

## Estructura del proyecto

```
conte/
├── CLAUDE.md            → este archivo
├── ESPECIFICACION.md    → especificación funcional y técnica completa
├── backend/             → Express + TypeScript + Prisma
│   ├── prisma.config.ts → configuración Prisma 7 (URL desde .env)
│   ├── prisma/          → schema.prisma (YA VALIDADO — no rediseñar) y migraciones
│   └── src/
│       ├── routes/      → endpoints por módulo
│       ├── controllers/ → lógica de cada endpoint
│       ├── middleware/  → autenticación (sesiones) y permisos por rol
│       └── lib/         → cliente Prisma y utilidades
└── frontend/            → React + TypeScript + Tailwind + Vite
    └── src/
        ├── pages/       → una por pantalla
        ├── components/  → piezas reutilizables
        └── api/         → funciones que llaman al backend
```

## Orden de desarrollo (respetar, no saltar etapas)

- Etapa 0: fundaciones — monorepo, migración inicial del schema a Supabase,
  backend base (Express), frontend base (Vite + layout).
- Etapa 1: autenticación y usuarios (bcrypt + express-session, middleware
  de roles, CRUD de ayudantes).
- Etapa 2: responsables (CRUD).
- Etapa 3: miembros (CRUD, filtros, búsqueda, detalle).
- Etapa 4: pagos de cuota de actividad (incluye multi-mes en transacción
  y comprobante descargable como imagen).
- Etapa 5: consulta de miembros sin pago registrado.
- Etapa 6: eventos, participantes y abonos.
- Etapa 7: configuración (nombre del club, año, cambio masivo a inactivo).
- Etapa 8: panel principal (va al final: resume todo lo anterior).
- Etapa 9: validaciones finales, pruebas, README, despliegue.

## Documentación

- Mantener el README.md actualizado al cerrar cada etapa.
- Documentar cada endpoint nuevo (método, ruta, permisos, cuerpo, respuesta).
- Registrar toda decisión técnica nueva en una sección "Decisiones" del README.
