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
      const safeName = file.originalname.replace(/[\\/:*?"<>|]/g, "").trim();
      cb(null, safeName);
    },
  });

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif)$/i;
const isImage = (f: Express.Multer.File) =>
  f.mimetype.startsWith("image/") &&
  f.mimetype !== "image/svg+xml" &&
  IMAGE_EXT_RE.test(f.originalname);

const upload = {
  icon: multer({
    storage: createStorage(PATHS.ICONS),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_r, f, cb) => {
      if (!isImage(f))
        return cb(new Error("Image attendue (png, jpg, webp, gif)") as any, false);
      cb(null, true);
    },
  }),
  screenshot: multer({
    storage: createStorage(PATHS.SCREENSHOTS),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_r, f, cb) => {
      if (!isImage(f))
        return cb(new Error("Image attendue (png, jpg, webp, gif)") as any, false);
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
    url: `${PUBLIC_URL}/assets/images/icons/${encodeURIComponent(req.file.filename)}`,
    name: req.file.filename,
    size: req.file.size,
  });
});

router.post(
  "/screenshot",
  upload.screenshot.single("screenshot"),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
    res.json({
      url: `${PUBLIC_URL}/assets/images/boxart/${encodeURIComponent(req.file.filename)}`,
      name: req.file.filename,
      size: req.file.size,
    });
  },
);

router.post("/nds", upload.nds.single("nds"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
  res.json({
    url: `${PUBLIC_URL}/api/v1/download/${encodeURIComponent(req.file.filename)}`,
    name: req.file.filename,
    size: req.file.size,
  });
});

router.post("/cia", upload.cia.single("cia"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
  res.json({
    url: `${PUBLIC_URL}/forwarder/${encodeURIComponent(req.file.filename)}`,
    name: req.file.filename,
    size: req.file.size,
  });
});

export default router;