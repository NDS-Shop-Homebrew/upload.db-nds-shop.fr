import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const username = "CreeperTV";
  const password = "gTE9mK&5533K#iYu7x@K";
  const role = "admin";

  // Hash du mot de passe
  const hashedPassword = await bcrypt.hash(password, 10);

  // Création utilisateur
  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      role,
    },
  });

  console.log("Utilisateur créé :", user);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
