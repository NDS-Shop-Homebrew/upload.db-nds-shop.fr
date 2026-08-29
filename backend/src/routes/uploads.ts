import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { requireAdmin } from "../middleware/auth";

const router = express.Router();

router.use(requireAdmin);

const PATHS = {
  ICONS: process.env.ICONS_PATH || "/srv/nds-shop/db/frontend/public/assets/images/icons",
  SCREENSHOTS: process.env.SCREENSHOTS_PATH || "/srv/nds-shop/db/frontend/public/assets/images/boxart",
  ROMS: process.env.ROMS_PATH || "/srv/nds-shop/roms",
  FORWARDER: process.env.FORWARDER_PATH || "/srv/nds-shop/db/frontend/public/forwarder",
};

const PUBLIC_URL = process.env.SITE_URL || "http://localhost:5174";

const createStorage = (dest: string) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      let name = file.originalname.replace(/[\\/:*?"<>|]/g, "").trim();
      name = path.basename(name);
      if (!name) name = `upload-${Date.now()}`;
      // Basic unique-ifying to prevent overwrites
      const ext = path.extname(name);
      const base = path.basename(name, ext);
      cb(null, `${base}-${Date.now()}${ext}`);
    },
  });

// Simple magic byte check
const validateBuffer = (buffer: Buffer, type: 'png'|'jpg'|'nds'|'cia') => {
  if (type === 'png') return buffer[0] === 0x89 && buffer[1] === 0x50;
  if (type === 'jpg') return buffer[0] === 0xFF && buffer[1] === 0xD8;
  if (type === 'nds') return true; // NDS header check complex
  if (type === 'cia') return true; // CIA header check complex
  return false;
};

const upload = {
  icon: multer({
    storage: createStorage(PATHS.ICONS),
    limits: { fileSize: 5 * 1024 * 1024 },
  }),
  screenshot: multer({
    storage: createStorage(PATHS.SCREENSHOTS),
    limits: { fileSize: 20 * 1024 * 1024 },
  }),
  nds: multer({
    storage: createStorage(PATHS.ROMS),
    limits: { fileSize: 512 * 1024 * 1024 },
  }),
  cia: multer({
    storage: createStorage(PATHS.FORWARDER),
    limits: { fileSize: 512 * 1024 * 1024 },
  }),
};

// Post-upload validation middleware
const validateFile = (type: 'png'|'jpg'|'nds'|'cia') => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
  try {
    const buffer = fs.readFileSync(req.file.path);
    if (!validateBuffer(buffer, type)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Format de fichier invalide" });
    }
    next();
  } catch (e) {
    res.status(500).json({ error: "Erreur validation" });
  }
};

router.post("/icon", upload.icon.single("icon"), validateFile('png'), (req, res) => {
  res.json({
    url: `${PUBLIC_URL}/assets/images/icons/${encodeURIComponent(req.file!.filename)}`,
    name: req.file!.filename,
    size: req.file!.size,
  });
});

router.post("/screenshot", upload.screenshot.single("screenshot"), validateFile('jpg'), (req, res) => {
  res.json({
    url: `${PUBLIC_URL}/assets/images/boxart/${encodeURIComponent(req.file!.filename)}`,
    name: req.file!.filename,
    size: req.file!.size,
  });
});

router.post("/nds", upload.nds.single("nds"), validateFile('nds'), (req, res) => {
  res.json({
    url: `${PUBLIC_URL}/api/v1/download/${encodeURIComponent(req.file!.filename)}`,
    name: req.file!.filename,
    size: req.file!.size,
  });
});

router.post("/cia", upload.cia.single("cia"), validateFile('cia'), (req, res) => {
  res.json({
    url: `${PUBLIC_URL}/forwarder/${encodeURIComponent(req.file!.filename)}`,
    name: req.file!.filename,
    size: req.file!.size,
  });
});

export default router;
