import express from "express";
import { requireAuth } from "../middleware/auth.ts";

const router = express.Router();

const GITHUB_REPO = process.env.GITHUB_REPO || "NDS-Shop-Homebrew/db-nds-shop";
const GITHUB_REF = process.env.GITHUB_REF || "refs/heads/dev";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

const gh = async (path: string) => {
  const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}${path}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "upload-backend",
      Accept: "application/vnd.github+json",
    },
  });
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${r.statusText}`);
  return r.json();
};

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

router.get("/status", requireAuth, async (req, res) => {
  try {
    const runs: any = await gh(
      `/actions/workflows/update.yml/runs?per_page=1`,
    );
    const run = runs.workflow_runs?.[0];
    if (!run) return res.json({ status: "none" });

    let jobs: any = null;
    let logs: string | null = null;
    if (run.status === "completed" || run.status === "in_progress") {
      const j: any = await gh(`/actions/runs/${run.id}/jobs`);
      jobs = j.jobs || [];
    }

    const summary = {
      id: run.id,
      status: run.status,
      conclusion: run.conclusion,
      html_url: run.html_url,
      created_at: run.created_at,
      updated_at: run.updated_at,
      jobs: jobs?.map((job: any) => ({
        id: job.id,
        name: job.name,
        status: job.status,
        conclusion: job.conclusion,
        steps: job.steps?.map((s: any) => ({
          name: s.name,
          status: s.status,
          conclusion: s.conclusion,
        })),
      })),
    };
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
