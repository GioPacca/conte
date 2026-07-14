// Configuración de Prisma 7 para CONTE.
// Desde Prisma 7, la URL de conexión no va en schema.prisma:
// se define acá y se lee del archivo .env.
// El .env NUNCA se sube a GitHub (contiene la contraseña de la base).
//
// Este archivo lo usa SOLO la CLI (migraciones), por eso lleva DIRECT_URL
// (pooler en modo sesión, puerto 5432): el pooler de transacción (6543)
// no soporta los comandos de migración. La app en runtime usa DATABASE_URL
// (ver src/lib/prisma.ts).

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DIRECT_URL!,
  },
});
