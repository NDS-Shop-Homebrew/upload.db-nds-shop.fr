import prisma from "../lib/prisma";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: ts-node src/utils/promote-super-admin.ts <email>");
    process.exit(1);
  }
  const res = await prisma.user.updateMany({
    where: { email },
    data: { role: "super-admin" },
  });
  console.log(`Promu : ${res.count} user(s) → super-admin (${email})`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
