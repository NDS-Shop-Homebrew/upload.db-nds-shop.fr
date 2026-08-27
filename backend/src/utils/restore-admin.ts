// Restauration d'urgence du compte admin après perte de la BDD.
// Usage: npx ts-node src/utils/restore-admin.ts <nouveauMotDePasse>
// Crée (ou répare) l'utilisateur admin + son compte credential avec un hash bcrypt,
// en suivant exactement les conventions de Better Auth (cf. lib/auth.ts).
import prisma from "../lib/prisma";
import { hash } from "bcrypt";
import { randomBytes } from "crypto";

const cuid = () => "c" + randomBytes(12).toString("base64url");

async function main() {
  const password = process.argv[2];
  if (!password || password.length < 8) {
    console.error("Usage: npx ts-node src/utils/restore-admin.ts <motDePasse> (min 8 caractères)");
    process.exit(1);
  }

  const hashed = await hash(password, 10);

  // 1. Utilisateur admin (upsert par username)
  const user = await prisma.user.upsert({
    where: { username: "admin" },
    update: { role: "super-admin", emailVerified: true },
    create: {
      id: cuid(),
      username: "admin",
      email: "admin@nds-shop.local",
      name: "Administrateur",
      role: "super-admin",
      emailVerified: true,
    },
  });

  // 2. Compte credential : supprime les anciens (provider "credential" ET "credentials")
  await prisma.account.deleteMany({
    where: { userId: user.id, providerId: { in: ["credential", "credentials"] } },
  });

  // 3. Recrée le compte proprement (accountId = username, providerId = "credential")
  await prisma.account.create({
    data: {
      id: cuid(),
      accountId: "admin",
      providerId: "credential",
      userId: user.id,
      password: hashed,
    },
  });

  console.log(`✅ Compte admin restauré (user id=${user.id})`);
  console.log(`   Identifiant : admin`);
  console.log(`   Mot de passe : celui passé en argument`);
  console.log(`   → Change-le immédiatement après connexion.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
