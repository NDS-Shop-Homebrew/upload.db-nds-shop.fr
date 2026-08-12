import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Rocket } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";

interface BuildStatusData {
  status: string;
  conclusion: string | null;
  log: string;
  updated_at: string | null;
}

interface BuildStatusProps {
  onTriggered: () => void;
}

export default function BuildStatus({ onTriggered }: BuildStatusProps) {
  const [data, setData] = useState<BuildStatusData | null>(null);
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
      const d = await res.json();
      setData(d.status === "none" ? null : d);
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
      setTimeout(fetchStatus, 1000);
    } catch (err: any) {
      setError(err.message || "Erreur réseau");
    } finally {
      setBuilding(false);
    }
  };

  const finished = data?.status === "completed" && data?.conclusion === "success";
  const failed = data?.status === "completed" && data?.conclusion !== "success";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <Rocket size={18} /> Build du site
        </CardTitle>
        <Button onClick={triggerBuild} disabled={building} className="gap-2" size="sm">
          {building ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {building ? "Build en cours…" : "Lancer le build"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!data && !error && (
          <p className="text-sm text-muted-foreground">Aucun build lancé récemment.</p>
        )}

        {data && (
          <>
            <div className="flex items-center gap-3 text-sm">
              {finished && <CheckCircle2 size={20} className="text-green-600 shrink-0" />}
              {failed && <XCircle size={20} className="text-red-600 shrink-0" />}
              {data.status === "in_progress" && <Loader2 size={20} className="animate-spin text-blue-600 shrink-0" />}
              <span className="font-medium capitalize">
                {data.conclusion || data.status}
              </span>
              {data.updated_at && (
                <span className="text-muted-foreground text-xs">
                  {new Date(data.updated_at).toLocaleString()}
                </span>
              )}
            </div>

            {data.log && (
              <pre className="text-xs bg-muted p-3 rounded-md max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {data.log}
              </pre>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}