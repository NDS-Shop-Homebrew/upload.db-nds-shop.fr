import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const game = await prisma.game.create({
    data: {
      slug: "mario-vs-donkey-kong-2-march-of-the-minis",
      title: "Mario vs. Donkey Kong 2 - March of the Minis",
      titleId: "A2MP",
      version: "1.0",
      author: "Nintendo",
      developer: "Nintendo Software Technology",
      publisher: "Nintendo",
      descriptionMd: "Mario vs. Donkey Kong 2: March of the Minis is a puzzle-platformer game.",
      systems: ["NDS"],
      genres: ["Puzzle", "Platformer"],
      categories: ["game"],
      priority: false,
      stars: 0,
    },
  });
  console.log("Created:", game.id);
}

main().finally(async () => {
  await prisma.$disconnect();
});