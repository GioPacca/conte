-- Se elimina anio_actual de la configuración (decidido con el usuario):
-- los formularios usan el año calendario del sistema como valor por defecto.
ALTER TABLE "configuracion" DROP COLUMN "anio_actual";
