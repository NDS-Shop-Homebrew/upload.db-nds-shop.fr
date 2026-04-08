import express from "express";
import multer from "multer";
import path from "path";

const router = express.Router();

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
      const safeName = file.originalname.replace(/\s+/g, "_");
      cb(null, safeName);
    },
  });

const upload = {
  icon: multer({ storage: createStorage(PATHS.ICONS) }),
  screenshot: multer({ storage: createStorage(PATHS.SCREENSHOTS) }),
  nds: multer({ storage: createStorage(PATHS.ROMS) }),
  cia: multer({ storage: createStorage(PATHS.FORWARDER) }),
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
