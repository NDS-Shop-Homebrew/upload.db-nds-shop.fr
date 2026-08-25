// Rattrapage one-shot : crée les entrées ndsdb manquantes pour tous les jeux existants.
// Usage sur le serveur : cd backend && npx ts-node scripts/backfill-ndsdb.ts
// Requiert GAMES_PATH et NDSDB_PATH dans .env (ou en variables d'environnement).
import "dotenv/config";
import fs from "fs";
import path from "path";
import { upsertNdsdbEntry } from "../src/lib/ndsdb.ts";

async function main() {
  const GAMES_PATH = process.env.GAMES_PATH;
  if (!GAMES_PATH) {
    console.error("GAMES_PATH manquant");
    process.exit(1);
  }
  const files = fs.readdirSync(GAMES_PATH).filter((f) => f.endsWith(".json"));
  console.log(`${files.length} jeu(x) à traiter`);
  let ok = 0;
  for (const f of files) {
    try {
      const g = JSON.parse(fs.readFileSync(path.join(GAMES_PATH, f), "utf8"));
      await upsertNdsdbEntry(g);
      ok++;
      console.log("✓", g.title || f);
    } catch (err: any) {
      console.error("✗", f, err.message);
    }
  }
  console.log(`Terminé : ${ok}/${files.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
