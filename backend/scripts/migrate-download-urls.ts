import "dotenv/config";
import fs from "fs";
import prisma from "../src/lib/prisma";

const GAMES_JSON =
  process.env.GAMES_JSON_PATH || "/srv/nds-shop/db/frontend/public/games.json";

async function main() {
  console.log("🔄 Début de la migration des URLs de téléchargement...\n");

  const allDownloads = await prisma.gameDownload.findMany({
    where: {
      url: {
        contains: "https://db-nds-shop.fr/games/",
      },
    },
  });

  let dbDownloadsUpdated = 0;
  for (const dl of allDownloads) {
    const newUrl = dl.url.replace(
      "https://db-nds-shop.fr/games/",
      "https://db-nds-shop.fr/api/v1/download/",
    );
    await prisma.gameDownload.update({
      where: { id: dl.id },
      data: { url: newUrl },
    });
    dbDownloadsUpdated++;
  }
  console.log(`📦 BDD (table GameDownload) : ${dbDownloadsUpdated} URL(s) mise(s) à jour`);

  const allScripts = await prisma.gameScript.findMany({
    where: {
      file: {
        contains: "https://db-nds-shop.fr/games/",
      },
    },
  });

  let dbScriptsUpdated = 0;
  for (const sc of allScripts) {
    const newFile = sc.file.replace(
      "https://db-nds-shop.fr/games/",
      "https://db-nds-shop.fr/api/v1/download/",
    );
    await prisma.gameScript.update({
      where: { id: sc.id },
      data: { file: newFile },
    });
    dbScriptsUpdated++;
  }
  console.log(`📜 BDD (table GameScript)   : ${dbScriptsUpdated} script(s) mis à jour`);

  let jsonChanged = 0;
  if (fs.existsSync(GAMES_JSON)) {
    try {
      const games = JSON.parse(fs.readFileSync(GAMES_JSON, "utf8"));
      for (const g of games) {
        if (!g.downloads) continue;
        for (const [, details] of Object.entries(g.downloads)) {
          if (
            typeof details === "object" &&
            (details as any).url &&
            (details as any).url.startsWith("https://db-nds-shop.fr/games/")
          ) {
            (details as any).url = (details as any).url.replace(
              "https://db-nds-shop.fr/games/",
              "https://db-nds-shop.fr/api/v1/download/",
            );
            jsonChanged++;
          }
        }
      }
      if (jsonChanged > 0) {
        fs.writeFileSync(GAMES_JSON, JSON.stringify(games, null, 2), "utf8");
        console.log(`📄 Fichier games.json        : ${jsonChanged} URL(s) mise(s) à jour`);
      }
    } catch (err: any) {
      console.warn(`⚠️ Erreur games.json: ${err.message}`);
    }
  }

  console.log("\n✨ Migration terminée avec succès !");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ Erreur de migration :", e);
  await prisma.$disconnect();
  process.exit(1);
});