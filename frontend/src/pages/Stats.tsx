import { useEffect, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Skeleton } from "../components/ui/skeleton";
import { RefreshCw, Loader2 } from "lucide-react";
import { useUI } from "../context/UIContext";

interface DayDl { date: string; total: number; nds: number; cia: number }
interface StatsDetail {
  users: number;
  games: number;
  downloads: { total: number; today: number; nds: number; cia: number; last30: DayDl[] };
  topGames: { title: string; count: number }[];
  versionCounts: Record<string, number>;
  systemCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  gamesByMonth: Record<string, number>;
  usersByMonth: Record<string, number>;
}

const API_URL = import.meta.env.VITE_API_URL || "";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4", "#EC4899", "#84CC16"];
const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  fontSize: 12,
};
const axisTick = { fill: "currentColor", fontSize: 12 };

function toList(record: Record<string, number>): { name: string; value: number }[] {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
}

export default function Stats() {
  const { t } = useUI();
  const [stats, setStats] = useState<StatsDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/admin/stats`, { credentials: "include" });
      if (!r.ok) throw new Error("stats: " + r.status);
      setStats(await r.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const catLabel = (c: string) => t(`stats.cat.${c}`);

  const pies = stats ? [
    { title: t("stats.byVersion"), data: toList(stats.versionCounts), nameKey: (n: string) => n },
    { title: t("stats.bySystem"), data: toList(stats.systemCounts), nameKey: (n: string) => n },
    { title: t("stats.byCategory"), data: toList(stats.categoryCounts), nameKey: catLabel },
  ] : [];

  const months = (rec: Record<string, number>) =>
    Object.entries(rec).sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => ({ month, count }));

  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("stats.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("stats.subtitle")}</p>
        </div>
        <Button onClick={load} variant="outline" size="sm" disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {t("stats.refresh")}
        </Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{t("stats.statsError")}: {error}</AlertDescription></Alert>}

      {!stats ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, j) => (
            <Card key={j}><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t("stats.games"), value: stats.games },
              { label: t("stats.totalDownloads"), value: stats.downloads.total },
              { label: t("stats.nds"), value: stats.downloads.nds },
              { label: t("stats.cia"), value: stats.downloads.cia },
            ].map((c) => (
              <Card key={c.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
                  <p className="text-2xl font-bold">{c.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">{t("stats.downloads30")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={stats.downloads.last30}>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Area type="monotone" dataKey="nds" name={t("stats.nds")} stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.35} />
                  <Area type="monotone" dataKey="cia" name={t("stats.cia")} stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.35} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {stats.topGames.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">{t("stats.topGames")}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(200, stats.topGames.length * 36)}>
                  <BarChart data={stats.topGames} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="title" tick={axisTick} tickLine={false} axisLine={false} width={280} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "currentColor", fillOpacity: 0.08 }} />
                    <Bar dataKey="count" name={t("stats.downloads")} fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pies.map((p) => (
              <Card key={p.title}>
                <CardHeader><CardTitle className="text-base">{p.title}</CardTitle></CardHeader>
                <CardContent>
                  {p.data.length === 0 ? (
                    <p className="text-sm text-muted-foreground">—</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={p.data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                          {p.data.map((_, j) => <Cell key={j} fill={COLORS[j % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend formatter={(value) => <span style={{ color: "var(--card-foreground)", fontSize: 12 }}>{p.nameKey(value)}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">{t("stats.gamesByMonth")}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={months(stats.gamesByMonth)}>
                    <CartesianGrid stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} minTickGap={16} />
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "currentColor", fillOpacity: 0.08 }} />
                    <Bar dataKey="count" name={t("stats.games")} fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">{t("stats.usersByMonth")}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={months(stats.usersByMonth)}>
                    <CartesianGrid stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} minTickGap={16} />
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "currentColor", fillOpacity: 0.08 }} />
                    <Bar dataKey="count" name={t("stats.users")} fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}