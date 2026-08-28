import "dotenv/config";
import fs from "fs";
import path from "path";
import prisma from "../src/lib/prisma";
import { upsertNdsdbEntry } from "../src/lib/ndsdb";
import { analyzeNds, formatNdsSerial } from "../src/lib/nds";

const STORAGE_PATH = process.env.STORAGE_PATH || path.resolve(process.cwd(), "..", "..", "storage");
const ROMS_PATH = process.env.ROMS_PATH || path.join(STORAGE_PATH, "assets", "roms", "nds");
const ICONS_PATH = process.env.ICONS_PATH || path.join(STORAGE_PATH, "assets", "icons");
const BOXARTS_PATH = process.env.BOXARTS_PATH || path.join(STORAGE_PATH, "assets", "boxarts");
const SCREENSHOTS_PATH = process.env.SCREENSHOTS_PATH || path.join(STORAGE_PATH, "assets", "screenshots");
const NDSDB_PATH = process.env.NDSDB_PATH || path.join(STORAGE_PATH, "ndsdb");
const API_INTERNAL = process.env.API_INTERNAL_URL || "http://localhost:3000";
const PUBLIC_URL = process.env.PUBLIC_URL || "http://localhost:5174";

// Assure l'existence de tous les dossiers cibles
[ICONS_PATH, BOXARTS_PATH, SCREENSHOTS_PATH, NDSDB_PATH].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Helper pour vérifier qu'un fichier existe et n'est pas vide
function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
  } catch {
    return false;
  }
}

// Helper de téléchargement HTTP/HTTPS résilient (rejette le contenu non-PNG corrompu)
async function downloadToFile(url: string, destPath: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    if (url.endsWith(".png") && !isPng) {
      console.warn(`    ⚠ Rejet ${url} : contenu non-PNG (${buf.length} octets, probable 404/erreur).`);
      return false;
    }
    if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
    fs.writeFileSync(destPath, buf);
    return true;
  } catch {
    return false;
  }
}

// Génération des candidats de noms pour le matching Libretro No-Intro
function getLibretroCandidates(title: string, rawFileName?: string): string[] {
  const candidates: string[] = [];

  if (rawFileName) {
    const baseName = rawFileName.replace(/\.(nds|dsi)$/i, "");
    candidates.push(baseName);
  }

  const clean = title.replace(/[\\/:*?"<>|]/g, "_").replace(/&/g, "_").trim();
  candidates.push(clean);
  candidates.push(`${clean} (USA)`);
  candidates.push(`${clean} (Europe)`);
  candidates.push(`${clean} (France)`);
  candidates.push(`${clean} (Europe) (En,Fr,De,Es,It)`);
  candidates.push(`${clean} (USA) (En,Fr,Es)`);

  return Array.from(new Set(candidates));
}

async function fetchLibretroAssets(candidates: string[], baseSlug: string) {
  const LIBRETRO_BASE = "https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Nintendo_DS/master";
  
  const boxartDest = path.join(BOXARTS_PATH, `${baseSlug}-front.png`);
  const snapDest = path.join(SCREENSHOTS_PATH, `${baseSlug}-snap-1.png`);

  let boxartFound = fileExists(boxartDest);
  let snapFound = fileExists(snapDest);

  // 1. Boxart : skip si déjà présent
  if (!boxartFound) {
    for (const name of candidates) {
      const url = `${LIBRETRO_BASE}/Named_Boxarts/${encodeURIComponent(name)}.png`;
      const ok = await downloadToFile(url, boxartDest);
      if (ok) {
        boxartFound = true;
        break;
      }
    }
  }

  // 2. Gameplay Snap : skip si déjà présent
  if (!snapFound) {
    for (const name of candidates) {
      const url = `${LIBRETRO_BASE}/Named_Snaps/${encodeURIComponent(name)}.png`;
      const ok = await downloadToFile(url, snapDest);
      if (ok) {
        snapFound = true;
        break;
      }
    }
  }

  const boxartUrl = boxartFound ? `${PUBLIC_URL}/assets/boxarts/${baseSlug}-front.png` : null;
  const screenshotUrl = snapFound ? `${PUBLIC_URL}/assets/screenshots/${baseSlug}-snap-1.png` : null;

  return { boxartUrl, screenshotUrl, boxartDest, snapDest, boxartCached: fileExists(boxartDest), snapCached: fileExists(snapDest) };
}

async function main() {
  console.log(`\n📦 Démarrage du pipeline de Build & Assets (Mode Incrémental)`);
  console.log(`📁 Stockage : ${STORAGE_PATH}`);
  console.log(`🌐 PUBLIC_URL cible : ${PUBLIC_URL}`);

  const games = await prisma.game.findMany({
    include: {
      downloads: true,
      screenshots: true,
    },
    orderBy: { title: "asc" },
  });

  let processed = 0;
  let skippedDownloads = 0;

  for (const game of games) {
    console.log(`\n▶ Traitement : ${game.title} (${game.id})`);
    const ndsDownload = game.downloads.find((d) => /\.nds$/i.test(d.filename));

    let updatedIconUrl = game.iconUrl;
    let updatedTitleId = game.titleId;
    let isDsi = false;
    let iconBuffer: Buffer | null = null;
    const iconDest = path.join(ICONS_PATH, `${game.id}.png`);

    // 1. Gestion de l'icône
    if (fileExists(iconDest)) {
      // Déjà extrait en cache
      updatedIconUrl = `${PUBLIC_URL}/assets/icons/${game.id}.png`;
      console.log(`  ⚡ Icône déjà en cache : assets/icons/${game.id}.png`);
    } else if (ndsDownload) {
      // Extraction depuis la ROM si absent
      const romCandidates = [
        path.join(ROMS_PATH, ndsDownload.filename),
        path.join(STORAGE_PATH, "assets", "roms", "nds", ndsDownload.filename),
        path.join(STORAGE_PATH, "roms", ndsDownload.filename),
      ];

      const romPath = romCandidates.find((p) => fs.existsSync(p));

      if (romPath) {
        try {
          const romData = fs.readFileSync(romPath);
          const meta = analyzeNds(romData);

          if (!updatedTitleId && meta.titleId) {
            updatedTitleId = meta.titleId;
          }
          isDsi = meta.isDsi;

          if (meta.icon) {
            const base64Data = meta.icon.replace(/^data:image\/png;base64,/, "");
            iconBuffer = Buffer.from(base64Data, "base64");
            const isPngIcon =
              iconBuffer.length > 8 &&
              iconBuffer[0] === 0x89 &&
              iconBuffer[1] === 0x50 &&
              iconBuffer[2] === 0x4e &&
              iconBuffer[3] === 0x47;
            if (!isPngIcon) {
              console.warn(`  ⚠ Icône extraite invalide pour ${game.title}, ignorée.`);
              iconBuffer = null;
            } else {
              fs.writeFileSync(iconDest, iconBuffer);
              updatedIconUrl = `${PUBLIC_URL}/assets/icons/${game.id}.png`;
              console.log(`  ✓ Nouvelle icône extraite (${meta.isDsi ? "DSi" : "DS"}) : assets/icons/${game.id}.png`);
            }
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(`  ⚠ Échec analyse ROM NDS : ${message}`);
        }
      }
    }

    // 2. Gestion Boxart & Gameplay Snap Libretro (Skip si déjà sur disque)
    const candidates = getLibretroCandidates(game.title, ndsDownload?.filename);
    const { boxartUrl, screenshotUrl, boxartDest, snapDest, boxartCached, snapCached } = await fetchLibretroAssets(candidates, game.id);

    if (boxartCached) {
      skippedDownloads++;
      console.log(`  ⚡ Boxart en cache : assets/boxarts/${game.id}-front.png`);
    } else if (boxartUrl) {
      console.log(`  📥 Boxart téléchargé : assets/boxarts/${game.id}-front.png`);
    }

    if (snapCached) {
      skippedDownloads++;
      console.log(`  ⚡ Gameplay Snap en cache : assets/screenshots/${game.id}-snap-1.png`);
    } else if (screenshotUrl) {
      console.log(`  📥 Gameplay Snap téléchargé : assets/screenshots/${game.id}-snap-1.png`);
    }

    // 3. Préparation des screenshots UniStore
    const screenshotsToCreate: { url: string; order: number }[] = [];
    if (boxartUrl) screenshotsToCreate.push({ url: boxartUrl, order: 0 });
    if (screenshotUrl) screenshotsToCreate.push({ url: screenshotUrl, order: 1 });

    // 4. Mise à jour en base de données seulement si nécessaire
    const needsDbUpdate =
      game.titleId !== updatedTitleId ||
      game.iconUrl !== updatedIconUrl ||
      game.boxartUrl !== boxartUrl ||
      (screenshotsToCreate.length > 0 && game.screenshots.length === 0);

    if (needsDbUpdate) {
      await prisma.game.update({
        where: { id: game.id },
        data: {
          titleId: updatedTitleId,
          iconUrl: updatedIconUrl || game.iconUrl,
          boxartUrl: boxartUrl || game.boxartUrl,
          screenshots: screenshotsToCreate.length > 0
            ? {
                deleteMany: {},
                create: screenshotsToCreate,
              }
            : undefined,
        },
      });
      console.log(`  ✓ Base de données mise à jour`);
    } else {
      console.log(`  ⚡ Base de données déjà à jour`);
    }

    // 5. Synchronisation NDSDB
    if (updatedTitleId) {
      const serialFull = formatNdsSerial(updatedTitleId, isDsi);
      const ndsdbMetaPath = path.join(NDSDB_PATH, serialFull, "meta.json");

      if (fileExists(ndsdbMetaPath)) {
        console.log(`  ⚡ NDSDB déjà synchronisé : ndsdb/${serialFull}/`);
      } else {
        await upsertNdsdbEntry({
          title: game.title,
          titleId: updatedTitleId,
          serial: serialFull,
          isDsi,
          developer: game.developer,
          publisher: game.publisher,
          genres: game.genres,
          description: game.descriptionMd,
          iconBuffer: iconBuffer || undefined,
          iconPath: fileExists(iconDest) ? iconDest : undefined,
          boxartPath: fileExists(boxartDest) ? boxartDest : undefined,
          screenshotPath: fileExists(snapDest) ? snapDest : undefined,
        });
        console.log(`  ✓ NDSDB synchronisé : ndsdb/${serialFull}/`);
      }
    }

    processed++;
  }

  console.log(`\n✨ Pipeline d'assets terminé (${processed} jeux traités, ${skippedDownloads} assets servis depuis le cache).`);

  // 6. Déclenchement HTTP UniStore
  try {
    console.log(`📡 Déclenchement de l'UniStore sur ${API_INTERNAL}/api/build/unistore...`);
    const res = await fetch(`${API_INTERNAL}/api/build/unistore`, { method: "POST" });
    if (res.ok) {
      console.log("✓ UniStore déclenché avec succès sur l'API.");
    } else {
      console.warn(`⚠ API UniStore a répondu avec le statut ${res.status}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`⚠ Impossible de contacter l'API pour générer l'UniStore : ${message}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ Erreur fatale :", e);
  await prisma.$disconnect();
  process.exit(1);
});