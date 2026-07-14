// Cliente Prisma único para toda la app (evita abrir múltiples pools de conexión).
// Prisma 7 exige un driver adapter: usamos @prisma/adapter-pg sobre pg.
// En runtime se conecta vía DATABASE_URL (pooler de transacción de Supabase);
// las migraciones usan DIRECT_URL (ver prisma.config.ts).
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
