import express from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import authRoutes from "./auth.ts";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const GAMES_PATH = process.env.GAMES_PATH!;
const ICONS_PATH = process.env.ICONS_PATH!;
const SCREENSHOTS_PATH = process.env.SCREENSHOTS_PATH!;
const ROMS_PATH = process.env.ROMS_PATH!;
const FORWARDER_PATH = process.env.FORWARDER_PATH!;

[ICONS_PATH, SCREENSHOTS_PATH, ROMS_PATH, FORWARDER_PATH].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use("/api/auth", authRoutes);

const formatDate = () => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes()) +
    ":" +
    pad(d.getSeconds()) +
    "+02:00"
  );
};

const storageWithOriginalName = (dest: string) =>
  multer.diskStorage({
    destination: dest,
    filename: (req, file, cb) => cb(null, file.originalname),
  });

const uploadIcon = multer({
  storage: storageWithOriginalName(ICONS_PATH),
  fileFilter: (req, file, cb) =>
    /\.(png|jpg|jpeg)$/i.test(file.originalname)
      ? cb(null, true)
      : cb(new Error("Seules les images PNG/JPG/JPEG sont autorisées")),
});

const uploadScreenshot = multer({
  storage: storageWithOriginalName(SCREENSHOTS_PATH),
  fileFilter: (req, file, cb) =>
    /\.(png|jpg|jpeg)$/i.test(file.originalname)
      ? cb(null, true)
      : cb(new Error("Seules les images PNG/JPG/JPEG sont autorisées")),
});

const uploadRom = multer({
  storage: storageWithOriginalName(ROMS_PATH),
  fileFilter: (req, file, cb) =>
    /\.(nds|zip)$/i.test(file.originalname)
      ? cb(null, true)
      : cb(new Error("Seuls les fichiers .nds ou .zip sont autorisés")),
});

const uploadCia = multer({
  storage: storageWithOriginalName(FORWARDER_PATH),
  fileFilter: (req, file, cb) =>
    /\.cia$/i.test(file.originalname)
      ? cb(null, true)
      : cb(new Error("Seuls les fichiers .cia sont autorisés")),
});

// --- Routes Upload ---
app.post("/api/upload/icon", uploadIcon.single("icon"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
  res.json({
    url: `https://db-nds-shop.fr/assets/images/icons/${req.file.originalname}`,
    name: req.file.originalname,
  });
});

app.post(
  "/api/upload/screenshot",
  uploadScreenshot.single("screenshot"),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
    res.json({
      url: `https://db-nds-shop.fr/assets/images/boxart/${req.file.originalname}`,
      name: req.file.originalname,
    });
  }
);

app.post("/api/upload/nds", uploadRom.single("nds"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
  res.json({
    url: `https://db-nds-shop.fr/games/${encodeURIComponent(
      req.file.originalname
    )}`,
    name: req.file.originalname,
  });
});

app.post("/api/upload/cia", uploadCia.single("cia"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
  res.json({
    url: `https://db-nds-shop.fr/forwarder/${encodeURIComponent(
      req.file.originalname
    )}`,
    name: req.file.originalname,
  });
});

// --- CRUD JSON ---
// Génération dynamique des scripts combinés par jeu
interface Screenshot {
  url: string;
  description: string;
}
const generateScripts = (
  downloads: Record<string, { url: string }>,
  screenshots: Screenshot[] = []
) => {
  const scripts: Record<string, any[]> = {};

  Object.keys(downloads)
    .filter((name) => name.endsWith(".nds"))
    .forEach((ndsName) => {
      const script: any[] = [];

      // Ajouter les screenshots
      screenshots.forEach((s) => {
        script.push({
          type: "downloadFile",
          file: s.url,
          output: `/_nds/TwiLightMenu/boxart/${ndsName}.png`,
        });
      });

      // Ajouter le .nds
      script.push({
        type: "downloadFile",
        file: downloads[ndsName].url,
        output: `/${ndsName}`,
      });

      // Vérifier si un .cia correspondant existe dans FORWARDER_PATH
      const ciaName = ndsName.replace(/\.nds$/i, ".cia");
      const ciaFilePath = path.join(FORWARDER_PATH, ciaName);
      if (fs.existsSync(ciaFilePath)) {
        script.push({
          type: "downloadFile",
          file: `https://db-nds-shop.fr/forwarder/${encodeURIComponent(
            ciaName
          )}`,
          output: `/${ciaName}`,
        });
        script.push({ type: "installCia", file: `/${ciaName}` });
        script.push({ type: "deleteFile", file: `/${ciaName}` });
      }

      scripts[ndsName] = script;
    });

  return scripts;
};

// GET tous les jeux
app.get("/api/games", (req, res) => {
  try {
    const files = fs.readdirSync(GAMES_PATH).filter((f) => f.endsWith(".json"));
    const games = files
      .map((file) => {
        const filePath = path.join(GAMES_PATH, file);
        try {
          return JSON.parse(fs.readFileSync(filePath, "utf-8"));
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    res.json(games);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT pour modifier un jeu existant
app.put("/api/games/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(GAMES_PATH, filename);

  try {
    const downloads = req.body.downloads || {};
    const screenshots = req.body.screenshots || [];
    const scripts = generateScripts(downloads, screenshots);

    const gameData = {
      ...req.body,
      updated: formatDate(),
      scripts,
    };
    fs.writeFileSync(filePath, JSON.stringify(gameData, null, 2), "utf-8");
    res.json({ message: "Modifié avec succès !" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la modification" });
  }
});

// POST pour créer un nouveau jeu
app.post("/api/games", (req, res) => {
  try {
    const { title, downloads, screenshots } = req.body;
    if (!title) return res.status(400).json({ error: "Le titre est requis" });

    const fileName =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") + ".json";
    const filePath = path.join(GAMES_PATH, fileName);
    const scripts = generateScripts(downloads || {}, screenshots || []);

    const gameData = {
      ...req.body,
      updated: formatDate(),
      scripts,
    };
    fs.writeFileSync(filePath, JSON.stringify(gameData, null, 2), "utf-8");
    res.json({ message: "JSON créé avec succès !", fileName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la création du JSON" });
  }
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
