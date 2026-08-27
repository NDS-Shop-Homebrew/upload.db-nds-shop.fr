import express from "express";
import fs from "fs";
import path from "path";
import prisma from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = express.Router();

const FORWARDER_PATH =
  process.env.FORWARDER_PATH || "/srv/nds-shop/db/frontend/public/forwarder";
const SCREENSHOTS_PATH =
  process.env.SCREENSHOTS_PATH ||
  "/srv/nds-shop/db/frontend/public/assets/images/screenshots";
const ROMS_PATH = process.env.ROMS_PATH || "/srv/nds-shop/roms";
const BUILD_LOG = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "../../build.log",
);
const LOG_FILE: string = BUILD_LOG;

// Discord (bot pour lister les membres du serveur)
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || "";

const discordApi = async (path: string) => {
  const r = await fetch(`https://discord.com/api/v10${path}`, {
    headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
  });
  if (!r.ok) throw new Error(`Discord ${r.status}`);
  return r.json();
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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

// Nombre de téléchargements .nds / .cia depuis le log nginx (derniers N jours)
function downloadCounts(days = 30) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateLabel = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const counts = {
    total: 0,
    today: 0,
    nds: 0,
    cia: 0,
    byGame: {} as Record<string, number>,
    last7: [0, 0, 0, 0, 0, 0, 0],
    last30: Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      return { date: dateLabel(d), total: 0, nds: 0, cia: 0 };
    }),
  };
  const cutoff = Date.now() / 1000 - days * 86400;
  const dayStart = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000;
  const todayStart = dayStart(new Date());

  const logPaths = [
    process.env.NGINX_LOG,
    "/var/log/nginx/access.log",
    "/var/log/nginx/db-nds-shop.access.log",
    "/srv/nds-shop/logs/access.log",
  ].filter(Boolean) as string[];

  const RE =
    /\[(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})[^\]]*\].*?"GET (\S+\.(?:nds|cia))/;
  for (const logPath of logPaths) {
    if (!fs.existsSync(logPath)) continue;
    try {
      const lines = fs.readFileSync(logPath, "utf8").split("\n");
      for (const line of lines) {
        const m = line.match(RE);
        if (!m) continue;
        const mon = MONTHS.indexOf(m[2]);
        if (mon < 0) continue;
        const ts =
          new Date(
            Number(m[3]),
            mon,
            Number(m[1]),
            Number(m[4]),
            Number(m[5]),
            Number(m[6]),
          ).getTime() / 1000;
        if (isNaN(ts) || ts < cutoff) continue;
        const file = decodeURIComponent(m[7].replace(/^\/games\//, ""));
        counts.total++;
        if (ts >= todayStart) counts.today++;
        if (file.endsWith(".nds")) counts.nds++;
        else counts.cia++;
        const game = file.split("/").pop() || "?";
        counts.byGame[game] = (counts.byGame[game] || 0) + 1;

        const dayIdx = Math.floor((todayStart - ts) / 86400);
        if (dayIdx >= 0 && dayIdx < days) {
          const slot = counts.last30[days - 1 - dayIdx];
          slot.total++;
          if (file.endsWith(".nds")) slot.nds++;
          else slot.cia++;
        }

        for (let i = 0; i < 7; i++) {
          const start = todayStart - i * 86400;
          if (ts >= start) {
            counts.last7[i]++;
            break;
          }
        }
      }
    } catch {}
  }
  return counts;
}

// GET /api/admin/stats — dashboard complet
router.get("/stats", requireAuth, async (_req, res) => {
  try {
    const [
      users,
      gamesList,
      forwarders,
      screenshotsCount,
      romsCount,
      buildLog,
      userRows,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.game.findMany({
        include: {
          downloads: true,
          screenshots: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
      fs.existsSync(FORWARDER_PATH)
        ? fs.readdirSync(FORWARDER_PATH).filter((f) => f.endsWith(".cia"))
            .length
        : 0,
      fs.existsSync(SCREENSHOTS_PATH)
        ? fs.readdirSync(SCREENSHOTS_PATH).filter((d) => {
            try {
              return fs.statSync(path.join(SCREENSHOTS_PATH, d)).isDirectory();
            } catch {
              return false;
            }
          }).length
        : 0,
      fs.existsSync(ROMS_PATH)
        ? fs.readdirSync(ROMS_PATH).filter((f) => f.endsWith(".nds")).length
        : 0,
      fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, "utf8") : "",
      prisma.user.findMany({ select: { createdAt: true } }),
    ]);

    let incomplete = 0,
      noRom = 0,
      noIcon = 0,
      noBoxart = 0;
    const incompleteGames: {
      id: string;
      title: string;
      noRom: boolean;
      noIcon: boolean;
      noBoxart: boolean;
    }[] = [];
    const titleByRom: Record<string, string> = {};
    const versionCounts: Record<string, number> = {};
    const systemCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const gamesByMonth: Record<string, number> = {};

    for (const g of gamesList) {
      const gAny = g as any;
      const hasRom = (g.downloads || []).some((d: any) =>
        (d.filename || d.url || "").toLowerCase().endsWith(".nds"),
      );
      const hasIcon = !!(
        gAny.iconUrl ||
        gAny.icon ||
        gAny.icon32 ||
        gAny.icon16
      );
      const hasBoxart = !!gAny.boxartUrl || g.screenshots.length > 0;

      const missing = {
        id: g.id,
        title: g.title,
        noRom: !hasRom,
        noIcon: !hasIcon,
        noBoxart: !hasBoxart,
      };

      if (!hasRom) noRom++;
      if (!hasIcon) noIcon++;
      if (!hasBoxart) noBoxart++;
      if (missing.noRom || missing.noIcon || missing.noBoxart) {
        incomplete++;
        incompleteGames.push(missing);
      }

      for (const d of g.downloads) {
        const fileName =
          (d.filename || d.url || "").split("/").pop() || d.filename || d.url;
        if (fileName) {
          titleByRom[fileName] = g.title;
        }
      }

      const ver = g.version || "?";
      versionCounts[ver] = (versionCounts[ver] || 0) + 1;

      const systems = safeJsonParse<string[]>(g.systems, []);
      for (const s of systems) systemCounts[s] = (systemCounts[s] || 0) + 1;

      const categories = safeJsonParse<string[]>(g.categories, []);
      for (const c of categories)
        categoryCounts[c] = (categoryCounts[c] || 0) + 1;

      const m = g.updatedAt ? g.updatedAt.toISOString().slice(0, 7) : "";
      if (m) gamesByMonth[m] = (gamesByMonth[m] || 0) + 1;
    }

    const recentGames = gamesList.slice(0, 8).map((g: any) => ({
      id: g.id,
      title: g.title,
      updatedAt: g.updatedAt,
    }));

    const usersByMonth: Record<string, number> = {};
    for (const u of userRows) {
      const m = u.createdAt.toISOString().slice(0, 7);
      usersByMonth[m] = (usersByMonth[m] || 0) + 1;
    }

    const downloads = downloadCounts(30);
    const byGame: Record<string, number> = {};
    for (const [file, n] of Object.entries(downloads.byGame)) {
      const title = titleByRom[file] || file;
      byGame[title] = (byGame[title] || 0) + n;
    }
    const topGames = Object.entries(byGame)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([title, count]) => ({ title, count }));

    const buildLines = buildLog.split("\n").filter((l: string) => l.trim().length > 0);
    const header = buildLines[0] || null;
    const lastBuildAt = header ? (header.match(/\[(.*?)\]/) || [])[1] : null;
    const lastBuildOk = header?.includes("SUCCESS") ?? null;
    const buildLogTail = buildLines.slice(-60).join("\n");

    res.json({
      users,
      games: gamesList.length,
      forwarders,
      screenshots: screenshotsCount,
      roms: romsCount,
      incomplete,
      noRom,
      noIcon,
      noBoxart,
      incompleteGames,
      recentGames,
      downloads,
      topGames,
      versionCounts,
      systemCounts,
      categoryCounts,
      gamesByMonth,
      usersByMonth,
      lastBuild: { at: lastBuildAt, ok: lastBuildOk },
      buildLog: buildLogTail,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users — liste (admin seulement)
router.get("/users", requireAdmin, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        banned: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Demandes de jeux (table game_request) ----

// GET /api/admin/requests — liste publique des demandes en attente
router.get("/requests", requireAuth, async (_req, res) => {
  try {
    const rows = await prisma.gameRequest.findMany({
      include: { _count: { select: { votes: true } } },
      orderBy: [{ votes: { _count: "desc" } }, { createdAt: "desc" }],
    });
    res.json(
      rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        systems: r.systems,
        note: r.note,
        requester: r.requesterName,
        createdAt: r.createdAt,
        votes: r._count?.votes || 0,
      })),
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/requests/:id — suppression manuelle (admin seulement)
router.delete("/requests/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.gameRequest.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Demande introuvable" });
  }
});

// ---- Discord / Équipe ----

// GET /api/admin/discord/guild — infos du serveur Discord
router.get("/discord/guild", requireAdmin, async (_req, res) => {
  try {
    const g = (await discordApi(
      `/guilds/${DISCORD_GUILD_ID}?with_counts=true`,
    )) as any;
    res.json({
      id: g.id as string,
      name: g.name as string,
      icon: g.icon
        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
        : null,
      memberCount: g.approximate_member_count as number,
      presenceCount: g.approximate_presence_count as number,
      description: g.description as string,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/discord/members — liste les membres du serveur
router.get("/discord/members", requireAdmin, async (_req, res) => {
  try {
    const members = await discordApi(
      `/guilds/${DISCORD_GUILD_ID}/members?limit=1000`,
    );
    const users = (members as any[])
      .filter((m: any) => !m.user.bot)
      .map((m: any) => ({
        id: m.user.id as string,
        username: m.user.username as string,
        global_name: (m.user.global_name || m.user.username) as string,
        avatar: m.user.avatar
          ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png`
          : null,
        nick: (m.nick || null) as string | null,
        roles: m.roles as string[],
      }));
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/discord/team — lecture depuis Prisma (table BotSetting)
router.get("/discord/team", requireAdmin, async (_req, res) => {
  try {
    const setting = await prisma.botSetting.findUnique({
      where: { key: "team_members" },
    });

    if (!setting || !setting.value) {
      return res.json({ members: [], updatedAt: null });
    }

    const data = safeJsonParse<{
      members?: any[];
      discordIds?: string[];
      updatedAt?: string;
    }>(setting.value, { members: [] });
    if (Array.isArray(data.discordIds)) {
      return res.json({
        members: data.discordIds.map((id: string) => ({ id, role: "" })),
        updatedAt: data.updatedAt ?? null,
      });
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/discord/team — sauvegarde en base MySQL (table BotSetting)
router.post("/discord/team", requireAdmin, async (req, res) => {
  try {
    const { members } = req.body || {};
    if (!Array.isArray(members)) {
      return res.status(400).json({ error: "members (array) requis" });
    }
    const clean = members
      .map((m: any) => ({
        id: typeof m?.id === "string" ? m.id : "",
        role: typeof m?.role === "string" ? m.role.trim() : "",
      }))
      .filter((m: { id: string }) => m.id)
      .filter(
        (m: { id: string }, i: number, arr: { id: string }[]) =>
          arr.findIndex((x) => x.id === m.id) === i,
      );

    const data = { members: clean, updatedAt: new Date().toISOString() };

    await prisma.botSetting.upsert({
      where: { key: "team_members" },
      update: { value: JSON.stringify(data) },
      create: { key: "team_members", value: JSON.stringify(data) },
    });

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
