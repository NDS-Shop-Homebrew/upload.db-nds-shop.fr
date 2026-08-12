import prisma from "../lib/prisma.ts";

async function main() {
  const res = await prisma.user.updateMany({
    where: { role: "super-admin" },
    data: { role: "admin" },
  });
  console.log(`Migré : ${res.count} user(s) super-admin → admin`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });