import fs from "fs";
import path from "path";

export async function upsertNdsdbEntry(gameData: any) {
  const base = process.env.NDSDB_PATH;
  if (!base || !gameData?.titleId) return;

  const serial = String(gameData.titleId).trim().toUpperCase();
  if (!/^[A-Z0-9-]{1,20}$/.test(serial)) return;

  const dir = path.join(base, serial);
  const metaPath = path.join(dir, "meta.json");
  let existing: any = {};

  try {
    if (fs.existsSync(metaPath)) {
      const raw = fs.readFileSync(metaPath, "utf8").replace(/^\uFEFF/, "");
      existing = JSON.parse(raw);
    }
  } catch {
    return;
  }

  let genres = existing.genres;
  if (Array.isArray(gameData.genres) && gameData.genres.length > 0) {
    genres = gameData.genres;
  } else if (typeof gameData.genres === "string" && gameData.genres.trim()) {
    try {
      const parsed = JSON.parse(gameData.genres);
      if (Array.isArray(parsed) && parsed.length > 0) genres = parsed;
    } catch {
      genres = gameData.genres.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
  }

  const updated: Record<string, any> = {
    ...existing,
    name: gameData.title ?? existing.name ?? serial,
    formal_name: gameData.title ?? existing.formal_name ?? serial,
    developer: gameData.developer || existing.developer,
    publisher: gameData.publisher || existing.publisher,
    genres,
    description: existing.description ?? gameData.description ?? gameData.descriptionMd ?? "",
  };

  for (const k of Object.keys(updated)) {
    if (updated[k] === undefined) {
      delete updated[k];
    }
  }

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(metaPath, JSON.stringify(updated, null, 2), "utf8");
  } catch (err) {
    console.error(`⚠️ Impossible d'écrire dans meta.json pour ${serial}:`, err);
  }
}