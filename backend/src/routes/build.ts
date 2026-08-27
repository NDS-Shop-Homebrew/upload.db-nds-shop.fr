import express from "express";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { requireAdmin } from "../middleware/auth";

const router = express.Router();

const isWindows = process.platform === "win32";

// Détection de la commande de build
const BUILD_COMMAND =
  process.env.BUILD_COMMAND ||
  (isWindows
    ? "npm run build"
    : process.env.BUILD_SCRIPT || "/srv/nds-shop/db/scripts/nds-build.sh");

const BUILD_CWD =
  process.env.BUILD_CWD ||
  (isWindows ? path.resolve(process.cwd(), "..") : "/srv/nds-shop/db");

const LOG_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../build.log"
);

// Assure l'existence du dossier de log
const logDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

interface BuildState {
  running: boolean;
  status: "none" | "running" | "success" | "failed";
  log: string;
  startedAt: string | null;
  finishedAt: string | null;
}

function getInitialState(): BuildState {
  if (fs.existsSync(LOG_FILE)) {
    try {
      const content = fs.readFileSync(LOG_FILE, "utf8");
      const firstLine = content.split("\n")[0] || "";
      const match = firstLine.match(/\[(.*?)\]\s+(SUCCESS|FAILED)/);
      if (match) {
        return {
          running: false,
          status: match[2] === "SUCCESS" ? "success" : "failed",
          log: content,
          startedAt: null,
          finishedAt: match[1],
        };
      }
    } catch {}
  }
  return {
    running: false,
    status: "none",
    log: "",
    startedAt: null,
    finishedAt: null,
  };
}

let state: BuildState = getInitialState();

// POST /api/build — lance le build en arrière-plan
router.post("/", requireAdmin, (_req, res) => {
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
  fs.writeFileSync(LOG_FILE, "");

  console.log(`🚀 [Build] Lancement de : "${BUILD_COMMAND}" dans "${BUILD_CWD}"`);

  // Exécution avec le shell système
  const child = spawn(BUILD_COMMAND, {
    cwd: BUILD_CWD,
    shell: true,
  });

  const append = (chunk: Buffer) => {
    const text = chunk.toString();
    state.log += text;
    try {
      fs.appendFileSync(LOG_FILE, text);
    } catch {}
  };

  child.stdout.on("data", append);
  child.stderr.on("data", append);

  child.on("error", (err) => {
    append(Buffer.from(`[spawn error] ${err.message}\n`));
    state.running = false;
    state.status = "failed";
    state.finishedAt = new Date().toISOString();
    fs.writeFileSync(LOG_FILE, `[${state.finishedAt}] FAILED\n` + state.log);
  });

  child.on("close", (code) => {
    state.running = false;
    state.status = code === 0 ? "success" : "failed";
    state.finishedAt = new Date().toISOString();
    fs.writeFileSync(
      LOG_FILE,
      `[${state.finishedAt}] ${code === 0 ? "SUCCESS" : "FAILED"}\n` + state.log
    );
  });

  res.json({ message: "Build lancé en arrière-plan" });
});

// GET /api/build/status
router.get("/status", requireAdmin, (_req, res) => {
  res.json({
    running: state.running,
    status: state.status,
    log: state.log.slice(-20000),
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
  });
});

export default router;