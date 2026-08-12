import prisma from "../lib/prisma.ts";
import bcrypt from "bcrypt";

const newPassword = process.env.ADMIN_PASSWORD || process.argv[2];

if (!newPassword) {
  console.error("Usage: ADMIN_PASSWORD=monmdp npx ts-node src/utils/set-password.ts");
  console.error("   or: npx ts-node src/utils/set-password.ts monmdp");
  process.exit(1);
}

const hashed = await bcrypt.hash(newPassword, 10);
const user = await prisma.user.update({
  where: { username: "admin" },
  data: { password: hashed },
});
console.log("✅ Mot de passe changé pour :", user.username);
await prisma.$disconnect();