import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { env } from "../config/env";

async function main() {
  const email = env.seedAdminEmail.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Seed: el usuario admin ${email} ya existe, no se modifica.`);
  } else {
    const passwordHash = await bcrypt.hash(env.seedAdminPassword, 10);
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: "Administrador",
        role: "ADMIN",
      },
    });
    console.log(`Seed: usuario admin creado -> ${email} / (contraseña definida en SEED_ADMIN_PASSWORD)`);
  }

  const siteNames = [
    "Medellín",
    "Villavicencio",
    "Pasto",
    "Chile",
    "La Estrella",
    "Ibagué",
    "BOD 16",
    "Barranquilla",
    "Funza",
    "LUC116",
    "LFONTIBON",
    "LCHAPINERO",
    "ISANTAI SABEL",
  ];

  for (const name of siteNames) {
    await prisma.site.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Seed: ${siteNames.length} sedes aseguradas.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
