// Migration one-shot : remplace /games/xxx.nds par /api/v1/download/xxx.nds dans games.json
// Usage sur le serveur : cd backend && npx ts-node scripts/migrate-download-urls.ts
import "dotenv/config";
import fs from "fs";
import path from "path";

const GAMES_JSON = process.env.GAMES_JSON_PATH || "/srv/nds-shop/db/frontend/public/games.json";

async function main() {
  if (!fs.existsSync(GAMES_JSON)) {
    console.error("❌ games.json introuvable");
    process.exit(1);
  }
  const games = JSON.parse(fs.readFileSync(GAMES_JSON, "utf8"));
  let changed = 0;
  for (const g of games) {
    if (!g.downloads) continue;
    for (const [name, details] of Object.entries(g.downloads)) {
      if (typeof details === "object" && details.url && details.url.startsWith("https://db-nds-shop.fr/games/")) {
        details.url = details.url.replace(
          "https://db-nds-shop.fr/games/",
          "https://db-nds-shop.fr/api/v1/download/",
        );
        changed++;
      }
    }
  }
  if (changed > 0) {
    fs.writeFileSync(GAMES_JSON, JSON.stringify(games, null, 2));
    console.log(`✅ ${changed} URL(s) mise(s) à jour dans games.json`);
  } else {
    console.log("✅ Aucune URL à mettre à jour");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});