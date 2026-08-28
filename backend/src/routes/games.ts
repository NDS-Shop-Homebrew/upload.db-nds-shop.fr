import express from "express";
import { requireAdmin } from "../middleware/auth";
import prisma from "../lib/prisma";
import { upsertNdsdbEntry } from "../lib/ndsdb";

const router = express.Router();

const API_INTERNAL_URL = process.env.API_INTERNAL_URL || "http://localhost:3000";
const PUBLIC_URL = process.env.SITE_URL || "http://localhost:5174";

// Déclenche la génération du Forwarder CIA auprès de api.db-nds-shop
async function triggerCiaGeneration(gameId: string) {
  try {
    const res = await fetch(`${API_INTERNAL_URL}/api/games/${gameId}/generate-cia`, {
      method: "POST",
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[CIA Generator] Échec pour "${gameId}": HTTP ${res.status} ${errText}`);
    } else {
      const data = await res.json();
      console.log(`[CIA Generator] CIA généré pour "${gameId}":`, data.filename);
    }
  } catch (err: any) {
    console.warn(`[CIA Generator] Erreur de communication API pour "${gameId}":`, err?.message || err);
  }
}

// Helper parsing sécurisé
function safeJsonParse<T>(val: unknown, fallback: T): T {
  if (!val) return fallback;
  if (Array.isArray(val) || typeof val === "object") return val as T;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

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

async function purgeRequests(title: string) {
  try {
    const requests = await prisma.gameRequest.findMany();
    const t = normTitle(title);
    const b = baseTitle(title);
    const ids = requests
      .filter((r: any) => {
        const rt = normTitle(r.title);
        return rt === t || rt.includes(b) || b.includes(rt);
      })
      .map((r: any) => r.id);
    if (ids.length) {
      await prisma.gameRequest.deleteMany({ where: { id: { in: ids } } });
      console.log(`Purge ${ids.length} demande(s) satisfaite(s) pour "${title}"`);
    }
  } catch (err) {
    console.error("Purge requests error (non bloquant):", err);
  }
}

// Génère la liste d'actions d'installation à plat pour Prisma GameScript
const generatePrismaScripts = (
  downloads: Record<string, { url: string }>,
  screenshots: { url: string }[],
) => {
  const scriptEntries: {
    name: string;
    type: string;
    file: string;
    output: string | null;
  }[] = [];

  Object.keys(downloads).forEach((ndsName) => {
    // 1. Screenshots
    screenshots.forEach((ss) => {
      const fileName = ss.url.split("/").pop() || "screenshot.png";
      scriptEntries.push({
        name: ndsName,
        type: "downloadFile",
        file: ss.url,
        output: `/photos/${fileName}`,
      });
    });

    // 2. ROM NDS
    scriptEntries.push({
      name: ndsName,
      type: "downloadFile",
      file: `${PUBLIC_URL}/games/${encodeURIComponent(ndsName)}`,
      output: `/roms/nds/${ndsName}`,
    });

    // 3. CIA Forwarder
    const ciaName = ndsName.replace(/\.nds$/i, ".cia");
    scriptEntries.push({
      name: ndsName,
      type: "downloadFile",
      file: `${PUBLIC_URL}/forwarder/${encodeURIComponent(ciaName)}`,
      output: `/${ciaName}`,
    });
    scriptEntries.push({
      name: ndsName,
      type: "installCia",
      file: `/${ciaName}`,
      output: null,
    });
    scriptEntries.push({
      name: ndsName,
      type: "deleteFile",
      file: `/${ciaName}`,
      output: null,
    });
  });

  return scriptEntries;
};

// Convertit un game Prisma en format JSON compat frontend
const gameToJson = (game: any) => {
  const downloads: Record<string, any> = {};
  (game.downloads || []).forEach((d: any) => {
    downloads[d.filename] = { url: d.url, size: d.size != null ? Number(d.size) : null };
  });

  const scripts: Record<string, any[]> = {};
  (game.scripts || []).forEach((s: any) => {
    if (!scripts[s.name]) {
      scripts[s.name] = [];
    }
    scripts[s.name].push({
      type: s.type,
      file: s.file,
      ...(s.output ? { output: s.output } : {}),
    });
  });

  return {
    ...game,
    systems: safeJsonParse<string[]>(game.systems, ["DS"]),
    genres: safeJsonParse<string[]>(game.genres, []),
    categories: safeJsonParse<string[]>(game.categories, ["game"]),
    icon: game.iconUrl || game.icon || "",
    boxart: game.boxartUrl || game.boxart || "",
    description: game.descriptionMd ?? game.description ?? "",
    downloads,
    scripts,
    screenshots: (game.screenshots || []).map((s: any) => ({
      url: s.url,
      description: s.order === 0 ? "Boxart" : "Screenshot",
    })),
    updated: game.updatedAt?.toISOString?.() || game.updatedAt,
  };
};

// Génération de slug propre
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Parse size proprement en BigInt / Number ou null
const parseSize = (size: any): bigint | null => {
  if (size === null || size === undefined || size === "") return null;
  const n = Number(size);
  return isNaN(n) ? null : BigInt(Math.floor(n));
};

// ─── GET / ──────────────────────────────────────────────────
router.get("/", async (_req, res) => {
  try {
    const games = await prisma.game.findMany({
      include: { downloads: true, scripts: true, screenshots: true },
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
  const { id } = req.params;
  try {
    const game = await prisma.game.findFirst({
      where: {
        OR: [
          { id },
          { titleId: id },
          { title: id },
        ],
      },
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

  const slug = slugify(title);
  const prismaScripts = generatePrismaScripts(downloads, screenshots);

  const existing = await prisma.game.findFirst({
    where: {
      OR: [
        { id: slug },
        ...(titleId ? [{ titleId }] : []),
      ],
    },
  });

  const descriptionValue =
    rest.descriptionMd !== undefined
      ? rest.descriptionMd
      : rest.description !== undefined
      ? rest.description
      : existing?.descriptionMd ?? null;

  try {
    let game;

    if (existing) {
      game = await prisma.game.update({
        where: { id: existing.id },
        data: {
          title: rest.title || existing.title,
          titleId: titleId !== undefined ? titleId : existing.titleId,
          systems: rest.systems ? JSON.stringify(rest.systems) : existing.systems,
          genres: rest.genres ? JSON.stringify(rest.genres) : existing.genres,
          categories: rest.categories ? JSON.stringify(rest.categories) : existing.categories,
          color: rest.color !== undefined ? rest.color : existing.color,
          colorBg: rest.colorBg !== undefined ? rest.colorBg : existing.colorBg,
          priority: rest.priority !== undefined ? rest.priority : existing.priority,
          stars: rest.stars !== undefined ? rest.stars : existing.stars,
          iconUrl: rest.iconUrl || rest.icon || existing.iconUrl,
          imageUrl: rest.imageUrl || rest.image || existing.imageUrl,
          boxartUrl: rest.boxartUrl || rest.boxart || existing.boxartUrl,
          author: rest.author !== undefined ? rest.author : existing.author,
          developer: rest.developer !== undefined ? rest.developer : existing.developer,
          publisher: rest.publisher !== undefined ? rest.publisher : existing.publisher,
          version: rest.version !== undefined ? rest.version : existing.version,
          ...(descriptionValue !== undefined ? { descriptionMd: descriptionValue } : {}),
          downloads: {
            deleteMany: {},
            create: Object.entries(downloads).map(([fileName, dl]: [string, any]) => ({
              filename: fileName,
              url: dl.url || "",
              size: parseSize(dl.size),
              type: fileName.endsWith(".cia") ? "cia" : "nds",
            })),
          },
          scripts: {
            deleteMany: {},
            create: prismaScripts,
          },
          screenshots: {
            deleteMany: {},
            create: screenshots.map((s: any, idx: number) => ({
              url: s.url,
              order: s.order !== undefined ? s.order : idx,
            })),
          },
        },
        include: { downloads: true, scripts: true, screenshots: true },
      });
    } else {
      game = await prisma.game.create({
        data: {
          id: slug,
          title,
          titleId: titleId || null,
          systems: JSON.stringify(rest.systems || ["DS"]),
          genres: JSON.stringify(rest.genres || []),
          categories: JSON.stringify(rest.categories || ["game"]),
          color: rest.color || null,
          colorBg: rest.colorBg || null,
          priority: rest.priority || false,
          stars: rest.stars || 0,
          iconUrl: rest.iconUrl || rest.icon || null,
          imageUrl: rest.imageUrl || rest.image || null,
          boxartUrl: rest.boxartUrl || rest.boxart || null,
          author: rest.author || null,
          developer: rest.developer || null,
          publisher: rest.publisher || null,
          version: rest.version || null,
          descriptionMd: rest.descriptionMd || rest.description || null,
          downloads: {
            create: Object.entries(downloads).map(([fileName, dl]: [string, any]) => ({
              filename: fileName,
              url: dl.url || "",
              size: parseSize(dl.size),
              type: fileName.endsWith(".cia") ? "cia" : "nds",
            })),
          },
          scripts: {
            create: prismaScripts,
          },
          screenshots: {
            create: screenshots.map((s: any, idx: number) => ({
              url: s.url,
              order: s.order !== undefined ? s.order : idx,
            })),
          },
        },
        include: { downloads: true, scripts: true, screenshots: true },
      });
    }

    await upsertNdsdbEntry({ title, titleId, downloads, screenshots, ...rest });
    await purgeRequests(title);

    const hasNds = Object.keys(downloads).some((k) => /\.nds$/i.test(k));
    if (hasNds) {
      triggerCiaGeneration(game.id);
    }

    res.json({
      message: existing ? "Jeu mis à jour !" : "Jeu créé !",
      game: gameToJson(game),
      fileName: game.id,
    });
  } catch (err: any) {
    console.error("POST /api/games error:", err);
    res.status(500).json({ error: err.message || "Erreur enregistrement jeu" });
  }
});

// ─── PUT /:id ───────────────────────────────────────────────
router.put("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { downloads = {}, screenshots = [], ...rest } = req.body;

  try {
    const existing = await prisma.game.findFirst({
      where: {
        OR: [
          { id },
          { titleId: id },
          { title: id },
        ],
      },
    });

    if (!existing) return res.status(404).json({ error: "Jeu non trouvé" });

    const existingData = existing as Record<string, any>;
    const prismaScripts = generatePrismaScripts(downloads, screenshots);

    const descriptionValue =
      rest.descriptionMd !== undefined
        ? rest.descriptionMd
        : rest.description !== undefined
        ? rest.description
        : existingData.descriptionMd ?? existingData.description ?? null;

    const game = await prisma.game.update({
      where: { id: existing.id },
      data: {
        title: rest.title || existing.title,
        titleId: rest.titleId !== undefined ? rest.titleId : existing.titleId,
        systems: rest.systems ? JSON.stringify(rest.systems) : existing.systems,
        genres: rest.genres ? JSON.stringify(rest.genres) : existing.genres,
        categories: rest.categories ? JSON.stringify(rest.categories) : existing.categories,
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
        ...(descriptionValue !== undefined ? { descriptionMd: descriptionValue } : {}),
        downloads: {
          deleteMany: {},
          create: Object.entries(downloads).map(([fileName, dl]: [string, any]) => ({
            filename: fileName,
            url: dl.url || "",
            size: parseSize(dl.size),
            type: fileName.endsWith(".cia") ? "cia" : "nds",
          })),
        },
        scripts: {
          deleteMany: {},
          create: prismaScripts,
        },
        screenshots: {
          deleteMany: {},
          create: screenshots.map((s: any, idx: number) => ({
            url: s.url,
            order: s.order !== undefined ? s.order : idx,
          })),
        },
      },
      include: { downloads: true, scripts: true, screenshots: true },
    });

    await upsertNdsdbEntry({ title: game.title, titleId: game.titleId, downloads, screenshots, ...rest });
    await purgeRequests(game.title);

    const hasNds = Object.keys(downloads).some((k) => /\.nds$/i.test(k));
    if (hasNds) {
      triggerCiaGeneration(game.id);
    }

    res.json({
      message: "Jeu mis à jour !",
      game: gameToJson(game),
      fileName: game.id,
    });
  } catch (err: any) {
    console.error("PUT /api/games/:id error:", err);
    res.status(500).json({ error: err.message || "Erreur mise à jour jeu" });
  }
});

// ─── DELETE /:id ────────────────────────────────────────────
router.delete("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const game = await prisma.game.findFirst({
      where: {
        OR: [
          { id },
          { titleId: id },
          { title: id },
        ],
      },
    });

    if (!game) return res.status(404).json({ error: "Jeu non trouvé" });

    await prisma.game.delete({ where: { id: game.id } });

    res.json({ message: `Jeu "${game.title}" supprimé` });
  } catch (err: any) {
    console.error("DELETE /api/games/:id error:", err);
    res.status(500).json({ error: err.message || "Erreur suppression jeu" });
  }
});

export default router;