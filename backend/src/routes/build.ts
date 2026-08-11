import express from "express";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { requireAuth } from "../middleware/auth.ts";

const router = express.Router();

const BUILD_SCRIPT = process.env.BUILD_SCRIPT || "/usr/local/bin/nds-build.sh";
const BUILD_LOG = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../build.log"
);

router.post("/", requireAuth, (req, res) => {
  try {
    const output = execSync(`"${BUILD_SCRIPT}" 2>&1`, {
      timeout: 600000,
      maxBuffer: 10 * 1024 * 1024,
    }).toString();
    const log = `[${new Date().toISOString()}] SUCCESS\n${output}`;
    fs.writeFileSync(BUILD_LOG, log);
    res.json({ message: "Build terminé", output: output.split("\n").filter(Boolean).slice(-10) });
  } catch (err: any) {
    const log = `[${new Date().toISOString()}] FAILED\n${err.stderr?.toString() || err.stdout?.toString() || err.message}`;
    try { fs.writeFileSync(BUILD_LOG, log); } catch {}
    res.status(500).json({ error: log.slice(0, 500) });
  }
});

router.get("/status", requireAuth, (req, res) => {
  try {
    if (!fs.existsSync(BUILD_LOG)) return res.json({ status: "none" });
    const content = fs.readFileSync(BUILD_LOG, "utf-8");
    const lines = content.split("\n");
    const header = lines[0] || "";
    const tail = lines.slice(-10).join("\n");
    const isSuccess = header.includes("SUCCESS");
    const isFailed = header.includes("FAILED");
    res.json({
      status: isSuccess ? "completed" : isFailed ? "failed" : "unknown",
      conclusion: isSuccess ? "success" : isFailed ? "failure" : null,
      log: tail,
      updated_at: header.match(/\[(.*?)\]/)?.[1] || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
