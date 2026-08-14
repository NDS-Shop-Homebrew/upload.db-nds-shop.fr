import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Rocket } from "lucide-react";
import { useUI } from "../context/UIContext";

const API_URL = import.meta.env.VITE_API_URL || "";

interface BuildStatusData {
  running: boolean;
  status: string;
  log: string;
  startedAt: string | null;
  finishedAt: string | null;
}

interface BuildStatusProps {
  onTriggered: () => void;
}

// Étapes détectées dans le log (=== ... ===)
const STEPS = ["Icônes", "Pages", "Frontmatter", "Forwarders"];

function detectSteps(log: string): { current: string | null; completed: string[] } {
  const completed: string[] = [];
  let current: string | null = null;
  const lines = log.split("\n");
  for (const line of lines) {
    const m = line.match(/^=== (.*?) ===/);
    if (m) {
      const step = m[1];
      completed.push(step);
      current = step;
    }
  }
  if (log.includes("Build terminé")) current = null;
  return { current, completed };
}

function countProgress(steps: { current: string | null; completed: string[] }): number {
  const known = steps.completed.filter((s) => STEPS.some((k) => s.toLowerCase().includes(k.toLowerCase())));
  return known.length;
}

export default function BuildStatus({ onTriggered }: BuildStatusProps) {
  const { t } = useUI();
  const [data, setData] = useState<BuildStatusData | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLPreElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/build/status`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const d = await res.json();
      setData(d.status === "none" ? null : d);
      setError(null);
    } catch (err: any) {
      setError(err.message || t("build.status"));
    }
  };

  useEffect(() => {
    fetchStatus();
    timerRef.current = setInterval(fetchStatus, 2000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [data?.log]);

  const triggerBuild = async () => {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/build`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || t("build.launch"));
      }
      onTriggered();
      setTimeout(fetchStatus, 1000);
    } catch (err: any) {
      setError(err.message || "Erreur réseau");
    } finally {
      setStarting(false);
    }
  };

  const running = data?.running || false;
  const finished = data?.status === "success";
  const failed = data?.status === "failed";
  const steps = detectSteps(data?.log || "");
  const progress = countProgress(steps);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <Rocket size={18} /> {t("build.title")}
        </CardTitle>
        <Button onClick={triggerBuild} disabled={starting || running} className="gap-2" size="sm">
          {running || starting ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {running ? t("build.building") : starting ? t("build.launch") + "…" : t("build.launch")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!data && !error && (
          <p className="text-sm text-muted-foreground">{t("build.noBuild")}</p>
        )}

        {data && (
          <>
            <div className="flex items-center gap-3 text-sm">
              {finished && <CheckCircle2 size={20} className="text-green-600 shrink-0" />}
              {failed && <XCircle size={20} className="text-red-600 shrink-0" />}
              {running && <Loader2 size={20} className="animate-spin text-blue-600 shrink-0" />}
              <span className="font-medium capitalize">{data.status === "success" ? t("build.success") : data.status === "failed" ? t("build.failed") : data.status}</span>
              {data.startedAt && (
                <span className="text-muted-foreground text-xs">
                  {new Date(data.startedAt).toLocaleTimeString()}
                  {data.finishedAt && (
                    <> · {new Date(data.finishedAt).toLocaleTimeString()}</>
                  )}
                </span>
              )}
            </div>

            {running && (
              <div className="space-y-1.5">
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, progress * 25 + (steps.current ? 12 : 0))}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  {STEPS.map((s) => (
                    <span key={s} className={steps.completed.some((c) => c.toLowerCase().includes(s.toLowerCase())) ? "text-primary font-medium" : ""}>
                      {s}
                    </span>
                  ))}
                </div>
                {steps.current && (
                  <p className="text-xs text-muted-foreground">{steps.current}</p>
                )}
              </div>
            )}

            {data.log && (
              <pre
                ref={logRef}
                className="text-xs bg-muted p-3 rounded-md h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed"
              >
                {data.log}
              </pre>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
