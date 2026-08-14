import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Users, Gamepad2, FileArchive, Image as ImageIcon, Download, Rocket,
  CheckCircle2, XCircle, Loader2, TrendingUp,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import { DarkModeToggle } from "../components/DarkModeToggle";
import { LangToggle } from "../components/LangToggle";

interface Stats {
  users: number;
  games: number;
  forwarders: number;
  screenshots: number;
  downloads: { total: number; today: number; nds: number; cia: number; byGame: Record<string, number> };
  lastBuild: { at: string | null; ok: boolean | null } | null;
  buildLog: string;
}

const API_URL = import.meta.env.VITE_API_URL || "";

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useUI();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const s = await fetch(`${API_URL}/api/admin/stats`, { credentials: "include" });
      if (!s.ok) throw new Error("stats: " + s.status);
      setStats(await s.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const statCards = stats ? [
    { icon: Gamepad2, label: t("dashboard.games"), value: stats.games, color: "text-primary" },
    { icon: Users, label: t("dashboard.users"), value: stats.users, color: "text-blue-500" },
    { icon: FileArchive, label: t("dashboard.forwarders"), value: stats.forwarders, color: "text-amber-500" },
    { icon: ImageIcon, label: t("dashboard.screenshots"), value: stats.screenshots, color: "text-purple-500" },
    { icon: Download, label: t("dashboard.downloads"), value: stats.downloads.total, color: "text-green-600" },
    { icon: TrendingUp, label: t("dashboard.today"), value: stats.downloads.today, color: "text-red-500" },
  ] : [];

  // Barres téléchargements par jeu (top 8)
  const topDownloads = stats?.downloads?.byGame
    ? Object.entries(stats.downloads.byGame).sort((a, b) => b[1] - a[1]).slice(0, 8)
    : [];
  const maxDownloads = topDownloads.length ? topDownloads[0][1] : 1;

  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("dashboard.greeting")} <strong>{user?.username}</strong> · {t("dashboard.role")}{" "}
            <Badge variant={user?.role === "admin" ? "default" : "secondary"}>{user?.role}</Badge>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle />
          <DarkModeToggle />
          <Button onClick={load} variant="outline" size="sm" disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : t("dashboard.refresh")}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{t("dashboard.statsError")}: {error}</p>}

      {/* Dernier build */}
      {stats?.lastBuild && (
        <Card className={stats.lastBuild.ok === true ? "border-green-300" : stats.lastBuild.ok === false ? "border-red-300" : "border-border"}>
          <CardContent className="p-4 flex items-center gap-3">
            <Rocket size={20} className="text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">{t("dashboard.lastBuild")}</p>
              <p className="text-sm">
                {stats.lastBuild.ok === null ? t("dashboard.noBuild") : stats.lastBuild.ok
                  ? <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle2 size={15} /> {t("dashboard.success")}</span>
                  : <span className="inline-flex items-center gap-1 text-red-600"><XCircle size={15} /> {t("dashboard.failed")}</span>}
                {stats.lastBuild.at && <span className="text-muted-foreground"> · {new Date(stats.lastBuild.at).toLocaleString()}</span>}
              </p>
            </div>
            {stats.buildLog && (
              <details className="text-xs w-full md:w-1/2">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">{t("dashboard.viewLog")}</summary>
                <pre className="mt-2 bg-muted p-3 rounded-md max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">{stats.buildLog}</pre>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <c.icon size={14} className={c.color} /> {c.label}
              </div>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top téléchargements */}
      {topDownloads.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("dashboard.topDownloads")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topDownloads.map(([game, count]) => (
              <div key={game} className="flex items-center gap-3">
                <span className="text-sm truncate w-56 shrink-0">{game}</span>
                <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(count / maxDownloads) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground shrink-0">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center pt-4">
        NDS-Shop · {new Date().getFullYear()} — {t("nav.backoffice")}
      </p>
    </div>
  );
}
