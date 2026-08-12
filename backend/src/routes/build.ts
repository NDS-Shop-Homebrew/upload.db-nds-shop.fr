import express from "express";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { requireAuth } from "../middleware/auth.ts";

const router = express.Router();

const BUILD_SCRIPT =
  process.env.BUILD_SCRIPT || "/srv/nds-shop/db/scripts/nds-build.sh";
const BUILD_CWD = process.env.BUILD_CWD || "/srv/nds-shop/db";
const BUILD_ROMS = process.env.BUILD_ROMS || "/srv/nds-shop/roms";
const BUILD_LOG = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../build.log"
);

interface BuildState {
  running: boolean;
  status: "none" | "running" | "success" | "failed";
  log: string;
  startedAt: string | null;
  finishedAt: string | null;
}

let state: BuildState = {
  running: false,
  status: "none",
  log: "",
  startedAt: null,
  finishedAt: null,
};

// POST /api/build — lance le build en arrière-plan (non bloquant)
router.post("/", requireAuth, (req, res) => {
  if (state.running) {
    return res.status(409).json({ error: "Un build est déjà en cours" });
  }

  state = {
    running: true,
    status: "running",
    log: "",
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };
  fs.writeFileSync(BUILD_LOG, "");

  const child = spawn(BUILD_SCRIPT, ["--roms", BUILD_ROMS], {
    cwd: BUILD_CWD,
    shell: false,
  });

  const append = (chunk: Buffer) => {
    const text = chunk.toString();
    state.log += text;
    try {
      fs.appendFileSync(BUILD_LOG, text);
    } catch {}
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);

  child.on("error", (err) => {
    append(Buffer.from(`[spawn error] ${err.message}\n`));
    state.running = false;
    state.status = "failed";
    state.finishedAt = new Date().toISOString();
    fs.writeFileSync(BUILD_LOG, `[${state.finishedAt}] FAILED\n` + state.log);
  });

  child.on("close", (code) => {
    state.running = false;
    state.status = code === 0 ? "success" : "failed";
    state.finishedAt = new Date().toISOString();
    // Préfixe [date] SUCCESS/FAILED pour que admin.ts détecte le statut
    fs.writeFileSync(
      BUILD_LOG,
      `[${state.finishedAt}] ${code === 0 ? "SUCCESS" : "FAILED"}\n` + state.log
    );
  });

  res.json({ message: "Build lancé en arrière-plan" });
});

// GET /api/build/status — log complet + position (temps réel)
router.get("/status", requireAuth, (_req, res) => {
  res.json({
    running: state.running,
    status: state.status,
    log: state.log.slice(-20000),
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
  });
});

export default router;