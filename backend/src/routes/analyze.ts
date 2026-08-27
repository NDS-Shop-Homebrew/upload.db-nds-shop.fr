import express from "express";
import multer from "multer";
import { analyzeNds } from "../lib/nds";
import { requireAdmin } from "../middleware/auth";

const router = express.Router();

router.use(requireAdmin);

// API ndsdb du site (même VM) pour récupérer le developer/publisher
const NDSDB_BASE = process.env.NDSDB_BASE || "http://localhost:3001";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 512 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.match(/\.nds$/i))
      return cb(new Error("Seuls les fichiers .nds sont acceptés") as any, false);
    cb(null, true);
  },
});

async function fetchNdsdbMeta(titleId: string) {
  try {
    const r = await fetch(`${NDSDB_BASE}/api/v1/ndsdb/metadata/${titleId}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

router.post("/nds", upload.single("nds"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
  try {
    const meta = analyzeNds(req.file.buffer);

    // Enrichit avec le developer/publisher depuis ndsdb si dispo
    if (meta.titleId) {
      const ndsdb = await fetchNdsdbMeta(meta.titleId);
      if (ndsdb) {
        if ((ndsdb as any).developer) meta.developer = (ndsdb as any).developer;
        if ((ndsdb as any).publisher) meta.publisher = (ndsdb as any).publisher;
        if ((ndsdb as any).genres?.length) meta.genres = (ndsdb as any).genres;
      }
    }

    res.json(meta);
  } catch (err: any) {
    res.status(422).json({ error: err.message || "ROM NDS invalide" });
  }
});

export default router;
