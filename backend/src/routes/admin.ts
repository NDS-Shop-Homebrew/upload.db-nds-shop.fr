import express from "express";
import fs from "fs";
import path from "path";
import prisma from "../lib/prisma.ts";
import { requireAdmin, requireAuth } from "../middleware/auth.ts";

const router = express.Router();

const GAMES_PATH = process.env.GAMES_PATH || "/srv/nds-shop/db/source/apps";
const FORWARDER_PATH =
  process.env.FORWARDER_PATH || "/srv/nds-shop/db/frontend/public/forwarder";
const SCREENSHOTS_PATH =
  process.env.SCREENSHOTS_PATH || "/srv/nds-shop/db/frontend/public/assets/images/screenshots";
const ROMS_PATH = process.env.ROMS_PATH || "/srv/nds-shop/roms";
const BUILD_LOG = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "../../build.log"
);

// Discord (bot pour lister les membres du serveur)
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || "";
const TEAM_MEMBERS_FILE =
  process.env.TEAM_MEMBERS_FILE || "/srv/nds-shop/team-members.json";

const discordApi = async (path: string) => {
  const r = await fetch(`https://discord.com/api/v10${path}`, {
    headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
  });
  if (!r.ok) throw new Error(`Discord ${r.status}`);
  return r.json();
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Nombre de téléchargements .nds / .cia depuis le log nginx (derniers N jours)
function downloadCounts(days = 30) {
  const counts = { total: 0, today: 0, nds: 0, cia: 0, byGame: {} as Record<string, number>, last7: [0,0,0,0,0,0,0] };
  const cutoff = Date.now() / 1000 - days * 86400;
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000;
  const todayStart = dayStart(new Date());
  // chemins de log candidats — on fusionne tous ceux qui existent
  const logPaths = [
    process.env.NGINX_LOG,
    "/var/log/nginx/access.log",
    "/var/log/nginx/db-nds-shop.access.log",
    "/srv/nds-shop/logs/access.log",
  ].filter(Boolean) as string[];

  const RE = /\[(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})[^\]]*\].*?"GET (\S+\.(?:nds|cia))/;
  for (const logPath of logPaths) {
    if (!fs.existsSync(logPath)) continue;
    try {
      const lines = fs.readFileSync(logPath, "utf8").split("\n");
      for (const line of lines) {
        // ligne nginx: IP - - [18/Sep/2026:14:00:00 +0200] "GET /games/xxx.nds HTTP/1.1" 200 ...
        const m = line.match(RE);
        if (!m) continue;
        const mon = MONTHS.indexOf(m[2]);
        if (mon < 0) continue;
        const ts = new Date(Number(m[3]), mon, Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6])).getTime() / 1000;
        if (isNaN(ts) || ts < cutoff) continue;
        const file = decodeURIComponent(m[7].replace(/^\/games\//, ""));
        counts.total++;
        if (ts >= todayStart) counts.today++;
        if (file.endsWith(".nds")) counts.nds++;
        else counts.cia++;
        const game = file.split("/").pop() || "?";
        counts.byGame[game] = (counts.byGame[game] || 0) + 1;
        // historique 7 jours
        for (let i = 0; i < 7; i++) {
          const start = todayStart - i * 86400;
          if (ts >= start) { counts.last7[i]++; break; }
        }
      }
    } catch {}
  }
  return counts;
}

// GET /api/admin/stats — dashboard complet
router.get("/stats", requireAuth, async (_req, res) => {
  try {
    const [users, games, forwarders, screenshots, roms, buildLog] = await Promise.all([
      prisma.user.count(),
      fs.existsSync(GAMES_PATH)
        ? fs.readdirSync(GAMES_PATH).filter((f) => f.endsWith(".json")).length
        : 0,
      fs.existsSync(FORWARDER_PATH)
        ? fs.readdirSync(FORWARDER_PATH).filter((f) => f.endsWith(".cia")).length
        : 0,
      fs.existsSync(SCREENSHOTS_PATH)
        ? fs.readdirSync(SCREENSHOTS_PATH).filter((d) => fs.statSync(path.join(SCREENSHOTS_PATH, d)).isDirectory()).length
        : 0,
      fs.existsSync(ROMS_PATH)
        ? fs.readdirSync(ROMS_PATH).filter((f) => f.endsWith(".nds")).length
        : 0,
      fs.existsSync(BUILD_LOG) ? fs.readFileSync(BUILD_LOG, "utf8") : "",
    ]);

    // Jeux incomplets : manque ROM, icône, boxart, titleId ou screenshots
    let incomplete = 0, noRom = 0, noIcon = 0, noBoxart = 0;
    const incompleteGames: { title: string; fileName: string; noRom: boolean; noIcon: boolean; noBoxart: boolean }[] = [];
    let recentGames: { title: string; updated: string }[] = [];
    if (fs.existsSync(GAMES_PATH)) {
      const files = fs.readdirSync(GAMES_PATH).filter((f) => f.endsWith(".json"));
      recentGames = files
        .map((f) => {
          try {
            return JSON.parse(fs.readFileSync(path.join(GAMES_PATH, f), "utf-8"));
          } catch { return null; }
        })
        .filter(Boolean)
        .map((g) => ({ title: g.title || "?", updated: g.updated || "" }))
        .sort((a, b) => (b.updated || "").localeCompare(a.updated || ""))
        .slice(0, 8);
      for (const f of files) {
        try {
          const g = JSON.parse(fs.readFileSync(path.join(GAMES_PATH, f), "utf-8"));
          const hasRom = Object.keys(g.downloads || {}).some((k: string) => k.endsWith(".nds"));
          const hasIcon = !!g.icon;
          const hasBoxart = (g.screenshots || []).some((s: any) => s.description === "Boxart");
          const missing = { title: g.title || "?", fileName: f, noRom: !hasRom, noIcon: !hasIcon, noBoxart: !hasBoxart };
          if (!hasRom) noRom++;
          if (!hasIcon) noIcon++;
          if (!hasBoxart) noBoxart++;
          if (missing.noRom || missing.noIcon || missing.noBoxart) {
            incomplete++;
            incompleteGames.push(missing);
          }
        } catch {}
      }
    }

    // Le header du build est la PREMIÈRE ligne : "[date] SUCCESS" ou "[date] FAILED"
    const buildLines = buildLog.split("\n").filter((l) => l.trim());
    const header = buildLines[0] || null;
    const lastBuildAt = header ? (header.match(/\[(.*?)\]/) || [])[1] : null;
    const lastBuildOk = header?.includes("SUCCESS") ?? null;
    const buildLogTail = buildLines.slice(-60).join("\n");

    res.json({
      users,
      games,
      forwarders,
      screenshots,
      roms,
      incomplete,
      noRom,
      noIcon,
      noBoxart,
      incompleteGames,
      recentGames,
      downloads: downloadCounts(30),
      lastBuild: { at: lastBuildAt, ok: lastBuildOk },
      buildLog: buildLogTail,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users — liste (admin seulement)
router.get("/users", requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, email: true, role: true, banned: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
});

// ---- Discord / Équipe ----

// GET /api/admin/discord/guild — infos du serveur Discord
router.get("/discord/guild", requireAdmin, async (_req, res) => {
  try {
    const g = await discordApi(`/guilds/${DISCORD_GUILD_ID}?with_counts=true`);
    res.json({
      id: g.id,
      name: g.name,
      icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
      memberCount: g.approximate_member_count,
      presenceCount: g.approximate_presence_count,
      description: g.description,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/discord/members — liste les membres du serveur
router.get("/discord/members", requireAdmin, async (_req, res) => {
  try {
    const members = await discordApi(`/guilds/${DISCORD_GUILD_ID}/members?limit=1000`);
    const users = members
      .filter((m: any) => !m.user.bot)
      .map((m: any) => ({
        id: m.user.id,
        username: m.user.username,
        global_name: m.user.global_name || m.user.username,
        avatar: m.user.avatar
          ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png`
          : null,
        nick: m.nick || null,
        roles: m.roles,
      }));
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/discord/team — lecture de la sélection
router.get("/discord/team", requireAdmin, (_req, res) => {
  try {
    if (!fs.existsSync(TEAM_MEMBERS_FILE))
      return res.json({ members: [], updatedAt: null });
    const data = JSON.parse(fs.readFileSync(TEAM_MEMBERS_FILE, "utf8"));
    // Rétrocompat : ancien format { discordIds: [] }
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

// POST /api/admin/discord/team — sauvegarde la sélection (membres + rôles, ordre préservé)
router.post("/discord/team", requireAdmin, (req, res) => {
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
          arr.findIndex((x) => x.id === m.id) === i
      );
    const data = { members: clean, updatedAt: new Date().toISOString() };
    fs.mkdirSync(path.dirname(TEAM_MEMBERS_FILE), { recursive: true });
    fs.writeFileSync(TEAM_MEMBERS_FILE, JSON.stringify(data, null, 2));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
