// migrate-auth.ts
//
// Migre l'authentification vers Better Auth :
// 1. Reset la base (schéma Better Auth)
// 2. Recrée l'admin existant avec son hash bcrypt conservé → même mot de passe
// 3. Rôle super-admin (gestion complète)
//
// Usage: npx ts-node src/utils/migrate-auth.ts
import { execSync } from "child_process";
import prisma from "../lib/prisma.ts";
import { hash } from "bcrypt";

async function main() {
  console.log("=== Reset du schéma Better Auth ===");
  execSync("npx prisma db push --force-reset --skip-generate", {
    cwd: process.cwd(),
    stdio: "inherit",
  });

  // Hash bcrypt conservé de l'ancien admin (même mot de passe).
  // Récupéré avant le reset — si non fourni, on crée un admin par défaut.
  const existingHash = process.env.ADMIN_HASH || "";

  const username = "admin";
  const email = "admin@nds-shop.local";
  const password = existingHash
    ? existingHash
    : await hash("change-me-now", 10);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      emailVerified: true,
      name: "Administrateur",
      role: "super-admin",
      accounts: {
        create: {
          id: crypto.randomUUID(),
          providerId: "credential",
          accountId: "admin",
          password,
        },
      },
    },
  });

  console.log(`✅ Admin migré : ${user.username} (${user.role})`);
  if (!existingHash) {
    console.log("⚠  Mot de passe temporaire : change-me-now");
  } else {
    console.log("✅ Mot de passe existant conservé (hash bcrypt réutilisé)");
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
