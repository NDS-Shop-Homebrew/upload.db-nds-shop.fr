import fs from "fs";
import path from "path";

// Écrit/enrichit l'entrée ndsdb du site (db/nds/base/<SERIAL>/meta.json)
// consommée par GET /api/v1/ndsdb/metadata/:serial côté db-nds-shop.
// ponytail: merge non destructif — la description riche du dataset n'est jamais écrasée
export async function upsertNdsdbEntry(gameData: any) {
  const base = process.env.NDSDB_PATH;
  if (!base || !gameData?.titleId) return;
  const serial = String(gameData.titleId).toUpperCase();
  if (!/^[A-Z0-9-]{1,20}$/.test(serial)) return;
  const dir = path.join(base, serial);
  const metaPath = path.join(dir, "meta.json");
  let existing: any = {};
  try {
    if (fs.existsSync(metaPath))
      // ponytail: si l'existant est illisible, on abandonne plutôt que d'écraser la fiche
      existing = JSON.parse(fs.readFileSync(metaPath, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return;
  }
  const updated = {
    ...existing,
    name: gameData.title ?? existing.name ?? serial,
    formal_name: gameData.title ?? existing.formal_name ?? serial,
    developer: gameData.developer || existing.developer,
    publisher: gameData.publisher || existing.publisher,
    genres: gameData.genres?.length ? gameData.genres : existing.genres,
    description: existing.description ?? gameData.description ?? "",
  };
  // retire les champs undefined (jeu sans publisher etc.)
  for (const k of Object.keys(updated)) {
    if (updated[k] === undefined) delete updated[k];
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(metaPath, JSON.stringify(updated, null, 2));
}
