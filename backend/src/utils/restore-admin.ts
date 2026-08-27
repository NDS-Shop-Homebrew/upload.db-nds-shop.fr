import { hash } from "bcrypt";
import { randomBytes } from "crypto";
import prisma from "../lib/prisma";

const cuid = () => "c" + randomBytes(12).toString("base64url");

async function main() {
  const password = process.argv[2];
  if (!password || password.length < 8) {
    console.error("Usage: npx tsx src/utils/restore-admin.ts <motDePasse> (min 8 caractères)");
    process.exit(1);
  }

  const hashedPassword = await hash(password, 10);
  const now = new Date();

  const user = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      role: "super-admin",
      banned: false,
      banReason: null,
      banExpires: null,
      emailVerified: true,
      updatedAt: now,
    },
    create: {
      id: cuid(),
      username: "admin",
      email: "admin@nds-shop.local",
      name: "Administrateur",
      role: "super-admin",
      banned: false,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.session.deleteMany({
    where: { userId: user.id },
  });

  await prisma.account.deleteMany({
    where: {
      userId: user.id,
      providerId: { in: ["credential", "credentials", "email-password"] },
    },
  });

  await prisma.account.create({
    data: {
      id: cuid(),
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    },
  });

  console.log(`\n✅ Compte admin restauré avec succès !`);
  console.log(`-----------------------------------------------`);
  console.log(`👤 Identifiant : admin`);
  console.log(`📧 Email       : ${user.email}`);
  console.log(`🛡️  Rôle        : super-admin`);
  console.log(`🔑 Mot de passe: [Défini avec succès]`);
  console.log(`-----------------------------------------------\n`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ Erreur lors de la restauration du compte admin :", e);
  await prisma.$disconnect();
  process.exit(1);
});