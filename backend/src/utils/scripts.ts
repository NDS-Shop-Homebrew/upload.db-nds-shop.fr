import prisma from "../lib/prisma.ts";
import bcrypt from "bcrypt";

async function main() {
  const username = "admin";
  const password = "adminadmin";
  const role = "ADMIN";

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      username,
      password: hashedPassword,
      role,
    },
  });

  console.log("Utilisateur prêt :", user.username);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
