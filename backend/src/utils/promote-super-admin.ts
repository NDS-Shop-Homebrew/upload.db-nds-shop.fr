import prisma from "../lib/prisma";

async function main() {
  const identifier = process.argv[2];

  if (!identifier) {
    console.error("Usage: ts-node src/utils/promote-super-admin.ts <email|username>");
    process.exit(1);
  }

  const res = await prisma.user.updateMany({
    where: {
      OR: [
        { email: identifier },
        { username: identifier },
      ],
    },
    data: { role: "super-admin" },
  });

  if (res.count === 0) {
    console.warn(`⚠️ Aucun utilisateur trouvé pour "${identifier}"`);
  } else {
    console.log(`✅ Promu : ${res.count} utilisateur(s) → super-admin (${identifier})`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ Erreur lors de la promotion :", e);
  await prisma.$disconnect();
  process.exit(1);
});