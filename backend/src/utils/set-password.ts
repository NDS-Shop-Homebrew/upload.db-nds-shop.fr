import { hash } from "bcrypt";
import { randomBytes } from "crypto";
import prisma from "../lib/prisma";

const cuid = () => "c" + randomBytes(12).toString("base64url");

async function main() {
  const args = process.argv.slice(2);
  let targetUser = "admin";
  let newPassword = process.env.ADMIN_PASSWORD || "";

  if (args.length === 1) {
    newPassword = args[0];
  } else if (args.length >= 2) {
    targetUser = args[0];
    newPassword = args[1];
  }

  if (!newPassword || newPassword.length < 8) {
    console.error("Usage:");
    console.error("  npx tsx src/utils/set-password.ts <nouveauMotDePasse>");
    console.error("  npx tsx src/utils/set-password.ts <username|email> <nouveauMotDePasse>");
    console.error("  ADMIN_PASSWORD=monmdp npx tsx src/utils/set-password.ts\n");
    console.error("⚠️  Le mot de passe doit faire au moins 8 caractères.");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: targetUser },
        { email: targetUser },
      ],
    },
  });

  if (!user) {
    console.error(`❌ Utilisateur "${targetUser}" introuvable dans la base de données.`);
    process.exit(1);
  }

  const hashedPassword = await hash(newPassword, 10);
  const now = new Date();

  const existingAccount = await prisma.account.findFirst({
    where: {
      userId: user.id,
      providerId: "credential",
    },
  });

  if (existingAccount) {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: {
        password: hashedPassword,
        updatedAt: now,
      },
    });
  } else {
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
  }

  await prisma.session.deleteMany({
    where: { userId: user.id },
  });

  console.log(`\n✅ Mot de passe mis à jour avec succès pour l'utilisateur "${user.username || user.email}" (ID: ${user.id}).`);
  console.log(`🔒 Toutes les sessions existantes ont été révoquées.`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ Erreur lors du changement de mot de passe :", e);
  await prisma.$disconnect();
  process.exit(1);
});