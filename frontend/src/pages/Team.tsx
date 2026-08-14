import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { UsersRound, Save, Search, RefreshCw } from "lucide-react";
import { useUI } from "../context/UIContext";

const API_URL = import.meta.env.VITE_API_URL || "";

interface DiscordMember {
  id: string;
  username: string;
  global_name: string;
  avatar: string | null;
  nick: string | null;
  roles: string[];
}

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  presenceCount: number;
  description: string | null;
}

export default function Team() {
  const { t } = useUI();
  const [members, setMembers] = useState<DiscordMember[]>([]);
  const [guild, setGuild] = useState<Guild | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, teamRes, g] = await Promise.all([
        fetch(`${API_URL}/api/admin/discord/members`, { credentials: "include" }),
        fetch(`${API_URL}/api/admin/discord/team`, { credentials: "include" }),
        fetch(`${API_URL}/api/admin/discord/guild`, { credentials: "include" }).catch(() => null),
      ]);
      if (!m.ok) throw new Error(await m.text());
      const members: DiscordMember[] = await m.json();
      const team = await teamRes.json();
      const guild = g?.ok ? await g.json() : null;
      setMembers(members);
      setSelected(new Set(team.discordIds || []));
      setGuild(guild);
    } catch (e: any) {
      setError(e.message || t("team.loading"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`${API_URL}/api/admin/discord/team`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordIds: [...selected] }),
      });
      if (!r.ok) throw new Error(await r.text());
      setMsg({ text: t("team.saved"), ok: true });
    } catch (e: any) {
      setMsg({ text: e.message || "Erreur", ok: false });
    } finally {
      setSaving(false);
    }
  };

  const filtered = members.filter((m) =>
    `${m.global_name} ${m.username} ${m.nick || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (selected.has(a.id) !== selected.has(b.id)) return selected.has(a.id) ? -1 : 1;
    return a.global_name.localeCompare(b.global_name);
  });

  return (
    <div className="p-6 md:p-8 w-full max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersRound className="w-6 h-6 text-primary" /> {t("team.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("team.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={load} className="gap-1.5">
            <RefreshCw size={14} /> {t("team.refresh")}
          </Button>
          <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
            <Save size={14} /> {saving ? "…" : t("team.save")}
          </Button>
        </div>
      </div>

      {guild && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            {guild.icon && <img src={guild.icon} alt={guild.name} className="w-10 h-10 rounded-full" />}
            <div>
              <p className="font-semibold">{guild.name}</p>
              <p className="text-xs text-muted-foreground">
                {guild.memberCount ?? "?"} membres · {guild.presenceCount ?? "?"} en ligne
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
      {msg && (
        <p className={`text-sm rounded-lg p-3 ${msg.ok ? "text-green-700 bg-green-50 border border-green-200" : "text-red-600 bg-red-50 border border-red-200"}`}>
          {msg.text}
        </p>
      )}

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("team.search")}
          className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">{t("team.loading")}</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[560px] overflow-y-auto">
              {sorted.map((m) => {
                const on = selected.has(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggle(m.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-b-0 text-left transition-colors ${on ? "bg-primary/5" : "hover:bg-muted/30"}`}
                  >
                    {m.avatar
                      ? <img src={m.avatar} alt={m.global_name} className="w-9 h-9 rounded-full shrink-0" />
                      : <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold shrink-0">{m.global_name.slice(0, 1)}</div>}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{m.global_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.nick || m.username}</p>
                    </div>
                    {on && <Badge>{t("team.teamBadge")}</Badge>}
                    <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${on ? "bg-primary border-primary text-primary-foreground" : "border-input"}`}>
                      {on && <span className="text-xs">✓</span>}
                    </div>
                  </button>
                );
              })}
              {sorted.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  {members.length === 0 ? t("team.noMembers") : t("team.noResults")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
