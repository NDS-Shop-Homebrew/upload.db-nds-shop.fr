import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Rocket } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

interface Step {
  name: string;
  status: string;
  conclusion: string | null;
}

interface RunInfo {
  id: number;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  jobs: { name: string; status: string; steps: Step[] }[];
}

interface BuildStatusProps {
  onTriggered: () => void;
}

const statusToIcon = (status: string, conclusion: string | null) => {
  if (conclusion === "success") return <CheckCircle2 size={16} className="text-green-600" />;
  if (conclusion === "failure" || conclusion === "cancelled")
    return <XCircle size={16} className="text-red-600" />;
  if (status === "in_progress") return <Loader2 size={16} className="animate-spin text-blue-600" />;
  if (status === "queued") return <Loader2 size={16} className="text-muted-foreground" />;
  return <RefreshCw size={16} className="text-muted-foreground" />;
};

export default function BuildStatus({ onTriggered }: BuildStatusProps) {
  const [run, setRun] = useState<RunInfo | null>(null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/build/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.status === "none") {
        setRun(null);
        return;
      }
      setRun(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Erreur");
    }
  };

  useEffect(() => {
    fetchStatus();
    timerRef.current = setInterval(fetchStatus, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const triggerBuild = async () => {
    setBuilding(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/build`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(await res.text());
      onTriggered();
      setTimeout(fetchStatus, 3000);
    } catch (err: any) {
      setError(err.message || "Erreur réseau");
    } finally {
      setBuilding(false);
    }
  };

  const steps = run?.jobs?.[0]?.steps || [];
  const done = steps.filter(
    (s) => s.conclusion === "success" || s.conclusion === "failure" || s.conclusion === "cancelled",
  ).length;
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;
  const finished =
    run?.status === "completed" && run.conclusion === "success";
  const failed = run?.status === "completed" && run.conclusion !== "success";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <Rocket size={18} /> Build du site
        </CardTitle>
        <Button
          onClick={triggerBuild}
          disabled={building}
          className="gap-2"
          size="sm"
        >
          {building ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          Déclencher le build
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!run && !error && (
          <p className="text-sm text-muted-foreground">
            Aucun build lancé récemment.
          </p>
        )}

        {run && (
          <>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">
                  Run #{run.id} · {run.status}
                  {run.conclusion ? ` · ${run.conclusion}` : ""}
                </span>
                <span>{pct}%</span>
              </div>
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    finished
                      ? "bg-green-500"
                      : failed
                        ? "bg-red-500"
                        : "bg-blue-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {steps.length > 0 && (
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-sm bg-muted/40 px-3 py-2 rounded-md"
                  >
                    <span className="shrink-0">
                      {statusToIcon(step.status, step.conclusion)}
                    </span>
                    <span className="flex-1 truncate">{step.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground capitalize">
                      {step.conclusion || step.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <a
              href={run.html_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-600 hover:underline block"
            >
              Voir sur GitHub →
            </a>
          </>
        )}
      </CardContent>
    </Card>
  );
}
