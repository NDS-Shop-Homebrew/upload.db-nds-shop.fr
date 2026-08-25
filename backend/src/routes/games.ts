import express from "express";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { requireAdmin } from "../middleware/auth.ts";
import prisma from "../lib/prisma.ts";
import { upsertNdsdbEntry } from "../lib/ndsdb.ts";

const router = express.Router();
const GAMES_PATH = process.env.GAMES_PATH!;
const GIT_REPO_PATH = process.env.GIT_REPO_PATH || "";

const FILENAME_RE = /^[\w.-]+\.json$/;
const isValidFilename = (name: string) =>
  FILENAME_RE.test(name) && !name.includes("..");

const formatDate = () =>
  new Date().toISOString().replace(/\.\d{3}Z$/, "+02:00");

// Même normalisation que le frontend (RequestGame.tsx) pour matcher les demandes
const normTitle = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[()[\],.'"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const baseTitle = (s: string) => {
  // ponytail: strip répété jusqu'à stabilité — sinon "Emeraude (Europe)" → "…emeraude"
  // mais "Emeraude" seul → "…emerau" (le "de" d'Allemagne est striper d'un seul côté)
  let out = normTitle(s);
  let prev: string;
  do {
    prev = out;
    out = out
      .replace(/\s*(france|europe|usa|japan|asia|australia|en|fr|de|es|it|jp)\s*$/i, "")
      .trim();
  } while (out !== prev);
  return out;
};

// Purge les demandes de jeux satisfaites par l'ajout d'un jeu au catalogue
// ponytail: non bloquant — si la BDD est down, la création du jeu réussit quand même
async function purgeRequests(title: string) {
  try {
    const requests = await prisma.gameRequest.findMany();
    const t = normTitle(title);
    const b = baseTitle(title);
    const ids = requests
      .filter((r) => normTitle(r.title) === t || (b.length >= 3 && baseTitle(r.title) === b))
      .map((r) => r.id);
    if (ids.length > 0) {
      await prisma.gameRequest.deleteMany({ where: { id: { in: ids } } });
      console.log(`🧹 ${ids.length} demande(s) purgée(s) après ajout de "${title}"`);
    }
  } catch (err) {
    console.error("⚠️ Purge des demandes échouée:", err);
  }
}

const generateScripts = (downloads: any, screenshots: any[] = []) => {
  const scripts: Record<string, any[]> = {};
  Object.keys(downloads)
    .filter((name) => name.endsWith(".nds"))
    .forEach((ndsName) => {
      const script: any[] = [];
      const boxart =
        screenshots.find((s) => s.url.includes("/boxart/")) ||
        screenshots[screenshots.length - 1];
      script.push({
        type: "downloadFile",
        file: boxart
          ? boxart.url
          : `https://db-nds-shop.fr/assets/images/boxart/${encodeURIComponent(ndsName)}.png`,
        output: `/_nds/TwiLightMenu/boxart/${ndsName}.png`,
      });
      script.push({
        type: "downloadFile",
        file: `https://db-nds-shop.fr/games/${encodeURIComponent(ndsName)}`,
        output: `/roms/nds/${ndsName}`,
      });

      const ciaName = ndsName.replace(/\.nds$/i, ".cia");
      script.push({
        type: "downloadFile",
        file: `https://db-nds-shop.fr/forwarder/${encodeURIComponent(ciaName)}`,
        output: `/${ciaName}`,
      });
      script.push({ type: "installCia", file: `/${ciaName}` });
      script.push({ type: "deleteFile", file: `/${ciaName}` });
      scripts[ndsName] = script;
    });
  return scripts;
};

const findExistingByTitleId = (titleId?: string) => {
  if (!titleId) return null;
  const files = fs.readdirSync(GAMES_PATH).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    try {
      const g = JSON.parse(fs.readFileSync(path.join(GAMES_PATH, file), "utf-8"));
      if (g.titleId === titleId) return { file, game: g };
    } catch {}
  }
  return null;
};

const gitPush = (message: string) => {
  if (!GIT_REPO_PATH) return;
  const repo = GIT_REPO_PATH;
  execFileSync("git", ["add", "-A"], { cwd: repo });
  try {
    execFileSync("git", ["commit", "-m", message], { cwd: repo, stdio: "pipe" });
  } catch (err: any) {
    const out = String(err?.stdout || err?.stderr || err?.message || "");
    if (!/nothing to commit|working tree clean/i.test(out)) throw err;
  }
  execFileSync("git", ["push"], { cwd: repo, stdio: "pipe" });
};

router.get("/", (req, res) => {
  try {
    const files = fs.readdirSync(GAMES_PATH).filter((f) => f.endsWith(".json"));
    const games = files.map((file) =>
      JSON.parse(fs.readFileSync(path.join(GAMES_PATH, file), "utf-8")),
    );
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la lecture des jeux" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  const { title, titleId, downloads, screenshots } = req.body;
  if (!title) return res.status(400).json({ error: "Titre requis" });

  const existing = findExistingByTitleId(titleId);
  if (existing)
    return res.status(409).json({
      error: "Ce jeu existe déjà",
      fileName: existing.file,
      game: existing.game,
    });

  const fileName = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
  const filePath = path.join(GAMES_PATH, fileName);

  const gameData = {
    ...req.body,
    updated: formatDate(),
    scripts: generateScripts(downloads || {}, screenshots || []),
  };

  fs.writeFileSync(filePath, JSON.stringify(gameData, null, 2));
  try {
    gitPush(`add ${fileName}`);
  } catch {
    return res
      .status(500)
      .json({ message: "Jeu créé localement mais échec du push git", fileName });
  }
  // Fiche ndsdb pour la page détail du site (non bloquant) + purge des demandes satisfaites
  await upsertNdsdbEntry(gameData);
  await purgeRequests(title);
  res.json({ message: "Jeu créé !", fileName });
});

router.put("/:filename", requireAdmin, async (req, res) => {
  const { filename } = req.params;
  if (!isValidFilename(filename))
    return res.status(400).json({ error: "Nom de fichier invalide" });
  const filePath = path.join(GAMES_PATH, filename);
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: "Fichier non trouvé" });

  const gameData = {
    ...req.body,
    updated: formatDate(),
    scripts: generateScripts(
      req.body.downloads || {},
      req.body.screenshots || [],
    ),
  };

  fs.writeFileSync(filePath, JSON.stringify(gameData, null, 2));
  try {
    gitPush(`update ${filename}`);
  } catch {
    return res
      .status(500)
      .json({ message: "Jeu mis à jour mais échec du push git" });
  }
  await upsertNdsdbEntry(gameData);
  res.json({ message: "Jeu mis à jour !" });
});

export default router;
