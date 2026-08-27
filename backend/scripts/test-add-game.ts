import prisma from "../src/lib/prisma";

async function main() {
  const game = await prisma.game.create({
    data: {
      id: "mario-vs-donkey-kong-2-march-of-the-minis",
      title: "Mario vs. Donkey Kong 2 - March of the Minis",
      titleId: "A2MP",
      version: "1.0",
      author: "Nintendo",
      developer: "Nintendo Software Technology",
      publisher: "Nintendo",
      descriptionMd: "Mario vs. Donkey Kong 2: March of the Minis is a puzzle-platformer game.",
      systems: JSON.stringify(["NDS"]),
      genres: JSON.stringify(["Puzzle", "Platformer"]),
      categories: JSON.stringify(["game"]),
      priority: false,
      stars: 0,
    },
  });

  console.log("✅ Jeu créé avec succès, ID :", game.id);
}

main()
  .catch((e: Error) => {
    console.error("❌ Erreur :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });