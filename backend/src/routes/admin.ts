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
const BUILD_LOG = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "../../build.log"
);
const NGINX_LOG = "/var/log/nginx/access.log";

// Nombre de téléchargements .nds / .cia depuis le log nginx (derniers N jours)
function downloadCounts(days = 30) {
  const counts = { total: 0, today: 0, nds: 0, cia: 0, byGame: {} as Record<string, number> };
  if (!fs.existsSync(NGINX_LOG)) return counts;
  const cutoff = Date.now() / 1000 - days * 86400;
  try {
    const lines = fs.readFileSync(NGINX_LOG, "utf8").split("\n");
    for (const line of lines) {
      // ligne nginx: IP - - [date] "GET /games/xxx.nds HTTP/1.1" 200 ...
      const m = line.match(/\[(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})[^\]]*\].*?"GET (\/games\/[^"]+\.(nds|cia))/);
      if (!m) continue;
      const ts = Date.parse(`${m[3]} ${m[2]} ${m[1]} ${m[4]}:${m[5]}:${m[6]}`);
      if (isNaN(ts) || ts < cutoff * 1000) continue;
      const file = decodeURIComponent(m[7]);
      counts.total++;
      const now = new Date();
      if (
        now.getFullYear() === new Date(ts).getFullYear() &&
        now.getMonth() === new Date(ts).getMonth() &&
        now.getDate() === new Date(ts).getDate()
      )
        counts.today++;
      if (file.endsWith(".nds")) counts.nds++;
      else counts.cia++;
      const game = file.split("/").pop() || "?";
      counts.byGame[game] = (counts.byGame[game] || 0) + 1;
    }
  } catch {}
  return counts;
}

// GET /api/admin/stats — dashboard complet
router.get("/stats", requireAuth, async (_req, res) => {
  try {
    const [users, games, forwarders, screenshots, buildLog] = await Promise.all([
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
      fs.existsSync(BUILD_LOG) ? fs.readFileSync(BUILD_LOG, "utf8") : "",
    ]);

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

export default router;
