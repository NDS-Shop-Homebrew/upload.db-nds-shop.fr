import "dotenv/config";
import fs from "fs";
import prisma from "../src/lib/prisma";

const GAMES_JSON =
  process.env.GAMES_JSON_PATH || "/srv/nds-shop/db/frontend/public/games.json";

const PUBLIC_URL = process.env.SITE_URL || "http://localhost:5174";

async function main() {
  console.log(`🔄 Début de la migration des URLs de téléchargement (Cible: ${PUBLIC_URL})...\n`);

  // Les deux formats à rechercher (l'ancien avec la variable non-interpolée et le nouveau avec la vraie URL)
  const oldTargetStr = "${PUBLIC_URL}/games/";
  const currentTargetStr = `${PUBLIC_URL}/games/`;
  const replacementStr = `${PUBLIC_URL}/api/v1/download/`;

  // 1. Table GameDownload
  const allDownloads = await prisma.gameDownload.findMany({
    where: {
      OR: [
        { url: { contains: oldTargetStr } },
        { url: { contains: currentTargetStr } },
      ],
    },
  });

  let dbDownloadsUpdated = 0;
  for (const dl of allDownloads) {
    let newUrl = dl.url;
    if (newUrl.includes(oldTargetStr)) {
      newUrl = newUrl.replaceAll(oldTargetStr, replacementStr);
    }
    if (newUrl.includes(currentTargetStr)) {
      newUrl = newUrl.replaceAll(currentTargetStr, replacementStr);
    }
    
    if (newUrl !== dl.url) {
      await prisma.gameDownload.update({
        where: { id: dl.id },
        data: { url: newUrl },
      });
      dbDownloadsUpdated++;
    }
  }
  console.log(
    `📦 BDD (table GameDownload) : ${dbDownloadsUpdated} URL(s) mise(s) à jour`,
  );

  // 2. Table GameScript
  const allScripts = await prisma.gameScript.findMany({
    where: {
      OR: [
        { file: { contains: oldTargetStr } },
        { file: { contains: currentTargetStr } },
      ],
    },
  });

  let dbScriptsUpdated = 0;
  for (const sc of allScripts) {
    let newFile = sc.file;
    if (newFile.includes(oldTargetStr)) {
      newFile = newFile.replaceAll(oldTargetStr, replacementStr);
    }
    if (newFile.includes(currentTargetStr)) {
      newFile = newFile.replaceAll(currentTargetStr, replacementStr);
    }

    if (newFile !== sc.file) {
      await prisma.gameScript.update({
        where: { id: sc.id },
        data: { file: newFile },
      });
      dbScriptsUpdated++;
    }
  }
  console.log(
    `📜 BDD (table GameScript)   : ${dbScriptsUpdated} script(s) mis à jour`,
  );

  // 3. Fichier games.json
  let jsonChanged = 0;
  if (fs.existsSync(GAMES_JSON)) {
    try {
      const games = JSON.parse(fs.readFileSync(GAMES_JSON, "utf8"));
      for (const g of games) {
        if (!g.downloads) continue;
        for (const [, details] of Object.entries(g.downloads)) {
          if (
            typeof details === "object" &&
            details !== null &&
            (details as any).url
          ) {
            let urlVal = (details as any).url;
            if (urlVal.includes(oldTargetStr) || urlVal.includes(currentTargetStr)) {
              urlVal = urlVal.replaceAll(oldTargetStr, replacementStr).replaceAll(currentTargetStr, replacementStr);
              (details as any).url = urlVal;
              jsonChanged++;
            }
          }
        }
      }
      if (jsonChanged > 0) {
        fs.writeFileSync(GAMES_JSON, JSON.stringify(games, null, 2), "utf8");
        console.log(
          `📄 Fichier games.json        : ${jsonChanged} URL(s) mise(s) à jour`,
        );
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