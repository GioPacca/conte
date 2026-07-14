import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import { rutasAuth } from './routes/auth.routes';
import { rutasUsuarios } from './routes/usuarios.routes';
import { rutasResponsables } from './routes/responsables.routes';
import { rutasMiembros } from './routes/miembros.routes';
import { rutasPagos } from './routes/pagos.routes';
import { rutasEventos } from './routes/eventos.routes';
import { rutasAbonos } from './routes/abonos.routes';
import { rutasConfiguracion } from './routes/configuracion.routes';
import { rutasPanel } from './routes/panel.routes';
import { rutasCotizacion } from './routes/cotizacion.routes';

if (!process.env.SESSION_SECRET) {
  throw new Error('Falta SESSION_SECRET en el archivo .env');
}

// En producción (Render) el backend corre detrás de HTTPS y de un proxy.
const enProduccion = process.env.NODE_ENV === 'production';

const app = express();
app.use(express.json());

if (enProduccion) {
  // Necesario para que Express reconozca HTTPS detrás del proxy de Render
  // (sin esto, la cookie con secure:true nunca se enviaría).
  app.set('trust proxy', 1);
}

// Las sesiones se guardan en la misma base PostgreSQL (tabla "session",
// creada automáticamente): sobreviven a los reinicios del servidor.
// Es una tabla de infraestructura, fuera del schema de Prisma.
const AlmacenPg = connectPgSimple(session);
const poolSesiones = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(
  session({
    store: new AlmacenPg({ pool: poolSesiones, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // no crear sesión hasta que alguien se loguee
    cookie: {
      httpOnly: true, // la cookie no es accesible desde JavaScript del navegador
      sameSite: 'lax', // el frontend llega vía rewrite de Vercel: misma origen
      secure: enProduccion, // solo por HTTPS en producción
      maxAge: 8 * 60 * 60 * 1000, // 8 horas: una jornada de trabajo
    },
  })
);

// Endpoint de salud: confirma que el server funciona.
app.get('/api/health', (_req, res) => {
  res.json({ estado: 'ok' });
});

app.use('/api/auth', rutasAuth);
app.use('/api/usuarios', rutasUsuarios);
app.use('/api/responsables', rutasResponsables);
app.use('/api/miembros', rutasMiembros);
app.use('/api/pagos', rutasPagos);
app.use('/api/eventos', rutasEventos);
app.use('/api/abonos', rutasAbonos);
app.use('/api/configuracion', rutasConfiguracion);
app.use('/api/panel', rutasPanel);
app.use('/api/cotizacion', rutasCotizacion);

// Manejador de errores: cualquier excepción no controlada responde 500
// sin filtrar detalles internos (se loguean solo en el servidor).
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`CONTE backend escuchando en http://localhost:${PORT}`);
});
