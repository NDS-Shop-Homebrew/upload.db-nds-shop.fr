import express from "express";
import multer from "multer";
import path from "path";
import { requireAuth } from "../middleware/auth.ts";

const router = express.Router();

router.use(requireAuth);

const PATHS = {
  ICONS: process.env.ICONS_PATH!,
  SCREENSHOTS: process.env.SCREENSHOTS_PATH!,
  ROMS: process.env.ROMS_PATH!,
  FORWARDER: process.env.FORWARDER_PATH!,
};

const createStorage = (dest: string) =>
  multer.diskStorage({
    destination: dest,
    filename: (req, file, cb) => {
      const safeName = file.originalname.replace(/[\\/:*?"<>|]/g, "").trim();
      cb(null, safeName);
    },
  });

const upload = {
  icon: multer({
    storage: createStorage(PATHS.ICONS),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_r, f, cb) => {
      if (!f.mimetype.startsWith("image/"))
        return cb(new Error("Fichier image attendu") as any, false);
      cb(null, true);
    },
  }),
  screenshot: multer({
    storage: createStorage(PATHS.SCREENSHOTS),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_r, f, cb) => {
      if (!f.mimetype.startsWith("image/"))
        return cb(new Error("Fichier image attendu") as any, false);
      cb(null, true);
    },
  }),
  nds: multer({
    storage: createStorage(PATHS.ROMS),
    limits: { fileSize: 512 * 1024 * 1024 },
    fileFilter: (_r, f, cb) => {
      if (!f.originalname.match(/\.nds$/i))
        return cb(new Error("Seuls les fichiers .nds sont acceptés") as any, false);
      cb(null, true);
    },
  }),
  cia: multer({
    storage: createStorage(PATHS.FORWARDER),
    limits: { fileSize: 512 * 1024 * 1024 },
    fileFilter: (_r, f, cb) => {
      if (!f.originalname.match(/\.cia$/i))
        return cb(new Error("Seuls les fichiers .cia sont acceptés") as any, false);
      cb(null, true);
    },
  }),
};

router.post("/icon", upload.icon.single("icon"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
  res.json({
    url: `https://db-nds-shop.fr/assets/images/icons/${req.file.filename}`,
    name: req.file.filename,
  });
});

router.post(
  "/screenshot",
  upload.screenshot.single("screenshot"),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
    res.json({
      url: `https://db-nds-shop.fr/assets/images/boxart/${req.file.filename}`,
      name: req.file.filename,
    });
  },
);

router.post("/nds", upload.nds.single("nds"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
  res.json({
    url: `https://db-nds-shop.fr/games/${encodeURIComponent(req.file.filename)}`,
    name: req.file.filename,
  });
});

router.post("/cia", upload.cia.single("cia"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
  res.json({
    url: `https://db-nds-shop.fr/forwarder/${encodeURIComponent(req.file.filename)}`,
    name: req.file.filename,
  });
});

export default router;
