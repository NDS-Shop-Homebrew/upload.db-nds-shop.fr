import express from "express";
import multer from "multer";
import { analyzeNds } from "../lib/nds.ts";

const router = express.Router();

// Analyse d'une ROM NDS en mémoire (on ne stocke pas le fichier ici).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 512 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.match(/\.nds$/i))
      return cb(new Error("Seuls les fichiers .nds sont acceptés") as any, false);
    cb(null, true);
  },
});

router.post("/nds", upload.single("nds"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
  try {
    const meta = analyzeNds(req.file.buffer);
    res.json(meta);
  } catch (err: any) {
    res.status(422).json({ error: err.message || "ROM NDS invalide" });
  }
});

export default router;
