// Script de instalación: crea el primer usuario TESORERO.
// Se corre UNA vez, desde backend/: npm run crear-tesorero
// Pide los datos por consola y escribe directo en la base (.env).

import 'dotenv/config';
import * as readline from 'node:readline/promises';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';

async function main() {
  const yaExiste = await prisma.usuario.findFirst({ where: { rol: 'TESORERO' } });
  if (yaExiste) {
    console.log(`Ya existe un tesorero (${yaExiste.email}). No se crea otro.`);
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const nombre = (await rl.question('Nombre: ')).trim();
  const apellido = (await rl.question('Apellido: ')).trim();
  const email = (await rl.question('Email: ')).trim();
  const password = (await rl.question('Contraseña (mínimo 8 caracteres): ')).trim();
  rl.close();

  if (!nombre || !apellido || !email || password.length < 8) {
    console.error('Datos inválidos: todos los campos son obligatorios y la contraseña debe tener al menos 8 caracteres.');
    process.exitCode = 1;
    return;
  }

  const tesorero = await prisma.usuario.create({
    data: {
      nombre,
      apellido,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      rol: 'TESORERO',
    },
  });

  console.log(`Tesorero creado: ${tesorero.nombre} ${tesorero.apellido} <${tesorero.email}>`);
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
