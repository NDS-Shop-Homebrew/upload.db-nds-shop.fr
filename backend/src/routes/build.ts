import express from "express";
import { requireAuth } from "../middleware/auth.ts";

const router = express.Router();

const GITHUB_REPO = process.env.GITHUB_REPO || "NDS-Shop-Homebrew/db-nds-shop";
const GITHUB_REF = process.env.GITHUB_REF || "refs/heads/dev";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

router.post("/", requireAuth, async (req, res) => {
  if (!GITHUB_TOKEN)
    return res.status(500).json({ error: "GITHUB_TOKEN non configuré" });
  try {
    const r = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/update.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "User-Agent": "upload-backend",
        },
        body: JSON.stringify({ ref: GITHUB_REF }),
      },
    );
    if (!r.ok)
      return res.status(r.status).json({ error: `GitHub: ${r.statusText}` });
    res.json({ message: "Build déclenché" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
