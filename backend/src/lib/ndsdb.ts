import fs from "fs";
import path from "path";
import { formatNdsSerial } from "./nds";

// Helper de copie ou écriture de fichier image dans le dossier NDSDB
function saveImageToDir(sourcePathOrBuffer: string | Buffer, destPath: string) {
  try {
    if (typeof sourcePathOrBuffer === "string") {
      if (fs.existsSync(sourcePathOrBuffer)) {
        fs.copyFileSync(sourcePathOrBuffer, destPath);
      }
    } else if (Buffer.isBuffer(sourcePathOrBuffer)) {
      fs.writeFileSync(destPath, sourcePathOrBuffer);
    }
  } catch (err) {
    console.warn(`⚠️ Échec copie image vers ${destPath}:`, err);
  }
}

export async function upsertNdsdbEntry(gameData: any) {
  const base = process.env.NDSDB_PATH;
  if (!base || !gameData?.titleId) return;

  const rawCode = String(gameData.titleId).trim().toUpperCase();
  // Génère le serial complet (ex: NTR-AYWP-EUR ou TWL-VTEE-USA) si non fourni
  const serial = gameData.serial || formatNdsSerial(rawCode, Boolean(gameData.isDsi));
  if (!/^[A-Z0-9-]{1,30}$/.test(serial)) return;

  const dir = path.join(base, serial);
  const oldShortDir = path.join(base, rawCode);

  // Migration automatique de l'ancien dossier court vers le dossier serial
  if (oldShortDir !== dir && fs.existsSync(oldShortDir) && !fs.existsSync(dir)) {
    try {
      fs.renameSync(oldShortDir, dir);
    } catch {}
  }

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

    // 1. Sauvegarde de l'icône dans ndsdb/[SERIAL]/icon.png
    if (gameData.iconBuffer) {
      saveImageToDir(gameData.iconBuffer, path.join(dir, "icon.png"));
    } else if (gameData.iconPath && fs.existsSync(gameData.iconPath)) {
      saveImageToDir(gameData.iconPath, path.join(dir, "icon.png"));
    }

    // 2. Sauvegarde du front boxart dans ndsdb/[SERIAL]/front_boxart.png
    if (gameData.boxartPath && fs.existsSync(gameData.boxartPath)) {
      saveImageToDir(gameData.boxartPath, path.join(dir, "front_boxart.png"));
    }

    // 3. Sauvegarde des screenshots dans ndsdb/[SERIAL]/screenshots/
    if (gameData.screenshotPath && fs.existsSync(gameData.screenshotPath)) {
      const screensDir = path.join(dir, "screenshots");
      if (!fs.existsSync(screensDir)) fs.mkdirSync(screensDir, { recursive: true });
      saveImageToDir(gameData.screenshotPath, path.join(screensDir, "screenshot_1.png"));
    }
  } catch (err) {
    console.error(`⚠️ Impossible d'écrire dans meta.json pour ${serial}:`, err);
  }
}