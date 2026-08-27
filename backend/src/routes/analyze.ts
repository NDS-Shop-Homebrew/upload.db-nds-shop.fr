import express from "express";
import multer from "multer";
import { analyzeNds } from "../lib/nds";
import { requireAdmin } from "../middleware/auth";

const router = express.Router();

router.use(requireAdmin);

// API ndsdb du site pour récupérer les métadonnées (developer, publisher, genres)
const NDSDB_BASE = process.env.NDSDB_BASE || "http://localhost:3001";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 512 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.match(/\.nds$/i)) {
      return cb(new Error("Seuls les fichiers .nds sont acceptés") as any, false);
    }
    cb(null, true);
  },
});

interface NdsdbMetadata {
  developer?: string;
  publisher?: string;
  genres?: string[];
  description?: string;
  description_fr?: string;
  description_en?: string;
  icon?: string;
}

async function fetchNdsdbMeta(titleId: string): Promise<NdsdbMetadata | null> {
  try {
    const r = await fetch(`${NDSDB_BASE}/api/v1/ndsdb/metadata/${titleId}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return null;
    return (await r.json()) as NdsdbMetadata;
  } catch {
    return null;
  }
}

router.post("/nds", upload.single("nds"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });

  try {
    const rawMeta = analyzeNds(req.file.buffer);

    const meta: any = {
      ...rawMeta,
      title: rawMeta.title ? rawMeta.title.split("\n")[0].trim() : "",
      genres: Array.isArray(rawMeta.genres) ? rawMeta.genres : [],
    };

    // Enrichissement depuis ndsdb si titleId est présent
    if (meta.titleId) {
      const ndsdb = await fetchNdsdbMeta(meta.titleId);
      if (ndsdb) {
        if (ndsdb.developer && !meta.developer) meta.developer = ndsdb.developer;
        if (ndsdb.publisher && !meta.publisher) meta.publisher = ndsdb.publisher;
        if (ndsdb.genres && Array.isArray(ndsdb.genres) && ndsdb.genres.length > 0) {
          meta.genres = ndsdb.genres;
        }
        if (ndsdb.description || ndsdb.description_fr || ndsdb.description_en) {
          meta.description = ndsdb.description_fr || ndsdb.description || ndsdb.description_en || "";
        }
        if (ndsdb.icon && !meta.icon) {
          meta.icon = ndsdb.icon;
        }
      }
    }

    res.json(meta);
  } catch (err: any) {
    res.status(422).json({ error: err.message || "ROM NDS invalide" });
  }
});

export default router;