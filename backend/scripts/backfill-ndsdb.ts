import "dotenv/config";
import fs from "fs";
import path from "path";
import prisma from "../src/lib/prisma";
import { upsertNdsdbEntry } from "../src/lib/ndsdb";

async function main() {
  const NDSDB_PATH = process.env.NDSDB_PATH;
  if (!NDSDB_PATH) {
    console.error("❌ NDSDB_PATH manquant dans .env");
    process.exit(1);
  }

  console.log(`📦 Synchronisation NDSDB vers : ${NDSDB_PATH}`);

  const games = await prisma.game.findMany({
    include: {
      downloads: true,
      screenshots: true,
    },
    orderBy: { title: "asc" },
  });

  let ok = 0;
  let skipped = 0;

  for (const game of games) {
    if (!game.titleId) {
      skipped++;
      continue;
    }

    try {
      await upsertNdsdbEntry({
        title: game.title,
        titleId: game.titleId,
        developer: game.developer,
        publisher: game.publisher,
        genres: game.genres,
        description: game.descriptionMd,
      });
      ok++;
      console.log(`  ✓ [${game.titleId}] ${game.title}`);
    } catch (err: any) {
      console.error(`  ✗ [${game.titleId}] ${game.title} - ${err.message}`);
    }
  }

  const GAMES_PATH = process.env.GAMES_PATH;
  if (GAMES_PATH && fs.existsSync(GAMES_PATH)) {
    const files = fs.readdirSync(GAMES_PATH).filter((f: string) => f.endsWith(".json"));
    for (const f of files) {
      try {
        const g = JSON.parse(fs.readFileSync(path.join(GAMES_PATH, f), "utf8"));
        if (g.titleId) {
          await upsertNdsdbEntry(g);
        }
      } catch {}
    }
  }

  console.log(`\n✨ Terminé : ${ok} synchronisés (${skipped} sans titleId).`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ Erreur fatale :", e);
  await prisma.$disconnect();
  process.exit(1);
});