import prisma from "../lib/prisma.ts";
import { hash } from "bcrypt";

const newPassword = process.env.ADMIN_PASSWORD || process.argv[2];

if (!newPassword) {
  console.error("Usage: ADMIN_PASSWORD=monmdp npx ts-node src/utils/set-password.ts");
  console.error("   or: npx ts-node src/utils/set-password.ts monmdp");
  process.exit(1);
}

const hashed = await hash(newPassword, 10);
const user = await prisma.user.findUnique({ where: { username: "admin" } });
if (!user) {
  console.error("User admin introuvable — lancez d'abord migrate-auth.ts");
  process.exit(1);
}

const account = await prisma.account.updateMany({
  where: { userId: user.id, providerId: "credential" },
  data: { password: hashed },
});
console.log(`✅ Mot de passe changé pour admin (${account.count} account mis à jour)`);
await prisma.$disconnect();
