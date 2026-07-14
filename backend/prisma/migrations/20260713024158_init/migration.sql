-- CreateEnum
CREATE TYPE "Estado" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('TESORERO', 'AYUDANTE');

-- CreateEnum
CREATE TYPE "RolMiembro" AS ENUM ('CONQUISTADOR', 'LIDER', 'DIRECTIVO');

-- CreateEnum
CREATE TYPE "Unidad" AS ENUM ('AMIGO', 'COMPANERO', 'EXPLORADOR', 'PIONERO', 'EXCURSIONISTA', 'GUIA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsables" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "telefono" TEXT,
    "tipo_relacion" TEXT,
    "observaciones" TEXT,

    CONSTRAINT "responsables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "miembros" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "telefono" TEXT,
    "unidad" "Unidad",
    "rol_miembro" "RolMiembro" NOT NULL,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "observaciones" TEXT,
    "responsable_id" TEXT,

    CONSTRAINT "miembros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_cuota_actividad" (
    "id" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha_pago" DATE NOT NULL,
    "observaciones" TEXT,
    "miembro_id" TEXT NOT NULL,
    "registrado_por_id" TEXT,

    CONSTRAINT "pagos_cuota_actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "fecha" DATE NOT NULL,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evento_participantes" (
    "id" TEXT NOT NULL,
    "fecha_asignacion" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evento_id" TEXT NOT NULL,
    "miembro_id" TEXT NOT NULL,

    CONSTRAINT "evento_participantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abonos_evento" (
    "id" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha_pago" DATE NOT NULL,
    "observaciones" TEXT,
    "participante_id" TEXT NOT NULL,
    "registrado_por_id" TEXT,

    CONSTRAINT "abonos_evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nombre_club" TEXT NOT NULL,
    "anio_actual" INTEGER NOT NULL,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "responsables_dni_key" ON "responsables"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "miembros_dni_key" ON "miembros"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_cuota_actividad_miembro_id_mes_anio_key" ON "pagos_cuota_actividad"("miembro_id", "mes", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "evento_participantes_evento_id_miembro_id_key" ON "evento_participantes"("evento_id", "miembro_id");

-- AddForeignKey
ALTER TABLE "miembros" ADD CONSTRAINT "miembros_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "responsables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_cuota_actividad" ADD CONSTRAINT "pagos_cuota_actividad_miembro_id_fkey" FOREIGN KEY ("miembro_id") REFERENCES "miembros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_cuota_actividad" ADD CONSTRAINT "pagos_cuota_actividad_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_participantes" ADD CONSTRAINT "evento_participantes_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_participantes" ADD CONSTRAINT "evento_participantes_miembro_id_fkey" FOREIGN KEY ("miembro_id") REFERENCES "miembros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonos_evento" ADD CONSTRAINT "abonos_evento_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "evento_participantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonos_evento" ADD CONSTRAINT "abonos_evento_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
