import express from "express";
import { execFileSync } from "child_process";
import { requireAdmin } from "../middleware/auth";
import prisma from "../lib/prisma";
import { upsertNdsdbEntry } from "../lib/ndsdb";

const router = express.Router();

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
async function purgeRequests(title: string) {
  try {
    const requests = await prisma.gameRequest.findMany();
    const t = normTitle(title);
    const b = baseTitle(title);
    const ids = requests
      .filter((r) => {
        const rt = normTitle(r.title);
        return rt === t || rt.includes(b) || b.includes(rt);
      })
      .map((r) => r.id);
    if (ids.length) {
      await prisma.gameRequest.deleteMany({ where: { id: { in: ids } } });
      console.log(`Purge ${ids.length} demande(s) satisfaite(s) pour "${title}"`);
    }
  } catch (err) {
    console.error("Purge requests error (non bloquant):", err);
  }
}

// Génère les scripts d'installation pour chaque ROM
const generateScripts = (
  downloads: Record<string, { url: string }>,
  screenshots: { url: string }[],
) => {
  const scripts: Record<string, any[]> = {};
  Object.keys(downloads).forEach((ndsName) => {
    const script: any[] = [];
    screenshots.forEach((ss) => {
      script.push({
        type: "downloadFile",
        file: ss.url,
        output: `/photos/${ss.url.split("/").pop()}`,
      });
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

// Convertit un game Prisma en format JSON compat frontend
const gameToJson = (game: any) => {
  const downloads: Record<string, any> = {};
  (game.downloads || []).forEach((d: any) => {
    downloads[d.fileName] = { url: d.url, size: d.size ? Number(d.size) : null };
  });
  const scripts: Record<string, any> = {};
  (game.scripts || []).forEach((s: any) => {
    scripts[s.name] = s.script;
  });
  return {
    ...game,
    downloads,
    scripts,
    updated: game.updatedAt?.toISOString?.() || game.updatedAt,
  };
};

// Ponytail: s'assurer que le slug existe
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// ─── GET / ──────────────────────────────────────────────────
router.get("/", async (_req, res) => {
  try {
    const games = await prisma.game.findMany({
      include: { downloads: true, scripts: true },
      orderBy: { title: "asc" },
    });
    res.json(games.map(gameToJson));
  } catch (err) {
    console.error("GET /api/games error:", err);
    res.status(500).json({ error: "Erreur lecture jeux" });
  }
});

// ─── GET /:id ───────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const game = await prisma.game.findUnique({
      where: { id: req.params.id },
      include: { downloads: true, scripts: true, screenshots: true },
    });
    if (!game) return res.status(404).json({ error: "Jeu non trouvé" });
    res.json(gameToJson(game));
  } catch (err) {
    console.error("GET /api/games/:id error:", err);
    res.status(500).json({ error: "Erreur lecture jeu" });
  }
});

// ─── POST / ─────────────────────────────────────────────────
router.post("/", requireAdmin, async (req, res) => {
  const { title, titleId, downloads = {}, screenshots = [], ...rest } = req.body;
  if (!title) return res.status(400).json({ error: "Titre requis" });

  // Vérifier doublon par titleId
  if (titleId) {
    const existing = await prisma.game.findFirst({ where: { titleId } });
    if (existing) {
      return res.status(409).json({
        error: "Ce jeu existe déjà",
        game: gameToJson(existing),
      });
    }
  }

  const slug = slugify(title);
  const scripts = generateScripts(downloads, screenshots);

  try {
    const game = await prisma.game.create({
      data: {
        id: slug,
        slug,
        title,
        titleId: titleId || null,
        systems: rest.systems || ["DS"],
        genres: rest.genres || [],
        categories: rest.categories || [],
        color: rest.color || null,
        colorBg: rest.colorBg || null,
        priority: rest.priority || false,
        stars: rest.stars || 0,
        iconUrl: rest.icon || null,
        imageUrl: rest.image || null,
        boxartUrl: rest.boxart || null,
        author: rest.author || null,
        developer: rest.developer || null,
        publisher: rest.publisher || null,
        version: rest.version || null,
        descriptionMd: rest.description || null,
        // Sous-tables
        downloads: {
          create: Object.entries(downloads).map(([fileName, dl]: [string, any]) => ({
            fileName,
            url: dl.url || "",
            size: dl.size || null,
            type: fileName.endsWith(".cia") ? "cia" : "nds",
          })),
        },
        scripts: {
          create: Object.entries(scripts).map(([name, script]) => ({
            name,
            script,
          })),
        },
      },
      include: { downloads: true, scripts: true },
    });

    // NDSDB + purge (non bloquant)
    await upsertNdsdbEntry({ title, titleId, downloads, screenshots, ...rest });
    await purgeRequests(title);

    res.json({ message: "Jeu créé !", game: gameToJson(game) });
  } catch (err: any) {
    console.error("POST /api/games error:", err);
    res.status(500).json({ error: err.message || "Erreur création jeu" });
  }
});

// ─── PUT /:id ───────────────────────────────────────────────
router.put("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { downloads = {}, screenshots = [], ...rest } = req.body;

  try {
    const existing = await prisma.game.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Jeu non trouvé" });

    const slug = rest.title ? slugify(rest.title) : existing.slug;
    const scripts = generateScripts(downloads, screenshots);

    // Mettre à jour le jeu + resync sous-tables
    const game = await prisma.game.update({
      where: { id },
      data: {
        slug,
        title: rest.title || existing.title,
        titleId: rest.titleId !== undefined ? rest.titleId : existing.titleId,
        systems: rest.systems || existing.systems,
        genres: rest.genres || existing.genres,
        categories: rest.categories || existing.categories,
        color: rest.color !== undefined ? rest.color : existing.color,
        colorBg: rest.colorBg !== undefined ? rest.colorBg : existing.colorBg,
        priority: rest.priority !== undefined ? rest.priority : existing.priority,
        stars: rest.stars !== undefined ? rest.stars : existing.stars,
        iconUrl: rest.icon !== undefined ? rest.icon : existing.iconUrl,
        imageUrl: rest.image !== undefined ? rest.image : existing.imageUrl,
        boxartUrl: rest.boxart !== undefined ? rest.boxart : existing.boxartUrl,
        author: rest.author !== undefined ? rest.author : existing.author,
        developer: rest.developer !== undefined ? rest.developer : existing.developer,
        publisher: rest.publisher !== undefined ? rest.publisher : existing.publisher,
        version: rest.version !== undefined ? rest.version : existing.version,
        descriptionMd: rest.description !== undefined ? rest.description : existing.descriptionMd,
        // Resync downloads
        downloads: {
          deleteMany: {},
          create: Object.entries(downloads).map(([fileName, dl]: [string, any]) => ({
            fileName,
            url: dl.url || "",
            size: dl.size || null,
            type: fileName.endsWith(".cia") ? "cia" : "nds",
          })),
        },
        // Resync scripts
        scripts: {
          deleteMany: {},
          create: Object.entries(scripts).map(([name, script]) => ({
            name,
            script,
          })),
        },
      },
      include: { downloads: true, scripts: true },
    });

    // NDSDB + purge (non bloquant)
    await upsertNdsdbEntry({ title: game.title, titleId: game.titleId, downloads, screenshots, ...rest });
    await purgeRequests(game.title);

    res.json({ message: "Jeu mis à jour !", game: gameToJson(game) });
  } catch (err: any) {
    console.error("PUT /api/games/:id error:", err);
    res.status(500).json({ error: err.message || "Erreur mise à jour jeu" });
  }
});

// ─── DELETE /:id ────────────────────────────────────────────
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const game = await prisma.game.findUnique({ where: { id: req.params.id } });
    if (!game) return res.status(404).json({ error: "Jeu non trouvé" });

    await prisma.game.delete({ where: { id: req.params.id } });

    res.json({ message: `Jeu "${game.title}" supprimé` });
  } catch (err: any) {
    console.error("DELETE /api/games/:id error:", err);
    res.status(500).json({ error: err.message || "Erreur suppression jeu" });
  }
});

export default router;
