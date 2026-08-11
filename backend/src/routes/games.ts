import express from "express";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { requireAuth } from "../middleware/auth.ts";

const router = express.Router();
const GAMES_PATH = process.env.GAMES_PATH!;
const FORWARDER_PATH = process.env.FORWARDER_PATH!;
const GIT_REPO_PATH = process.env.GIT_REPO_PATH || "";

const formatDate = () =>
  new Date().toISOString().replace(/\.\d{3}Z$/, "+02:00");

const generateScripts = (downloads: any, screenshots: any[] = []) => {
  const scripts: Record<string, any[]> = {};
  Object.keys(downloads)
    .filter((name) => name.endsWith(".nds"))
    .forEach((ndsName) => {
      const script: any[] = [];
      screenshots.forEach((s) => {
        script.push({
          type: "downloadFile",
          file: s.url,
          output: `/_nds/TwiLightMenu/boxart/${ndsName}.png`,
        });
      });
      script.push({
        type: "downloadFile",
        file: downloads[ndsName].url,
        output: `/${ndsName}`,
      });

      const ciaName = ndsName.replace(/\.nds$/i, ".cia");
      if (fs.existsSync(path.join(FORWARDER_PATH, ciaName))) {
        script.push({
          type: "downloadFile",
          file: `https://db-nds-shop.fr/forwarder/${encodeURIComponent(ciaName)}`,
          output: `/${ciaName}`,
        });
        script.push({ type: "installCia", file: `/${ciaName}` });
        script.push({ type: "deleteFile", file: `/${ciaName}` });
      }
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
  execSync("git add -A", { cwd: repo });
  execSync(`git commit -m "${message.replace(/"/g, "'")}" || true`, { cwd: repo });
  execSync("git push", { cwd: repo, stdio: "pipe" });
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

router.post("/", requireAuth, (req, res) => {
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
  res.json({ message: "Jeu créé !", fileName });
});

router.put("/:filename", requireAuth, (req, res) => {
  const { filename } = req.params;
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
  res.json({ message: "Jeu mis à jour !" });
});

export default router;
