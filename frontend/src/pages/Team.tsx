import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Alert, AlertDescription } from "../components/ui/alert";
import { UsersRound, Save, Search, RefreshCw, ChevronUp, ChevronDown, X } from "lucide-react";
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

interface TeamMember {
  id: string;
  role: string;
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
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const memberOf = (id: string) => members.find((m) => m.id === id);

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
      setTeam(team.members || []);
      setGuild(guild);
    } catch (e: any) {
      setError(e.message || t("team.loading"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = (id: string) => {
    setTeam((prev) => [...prev, { id, role: "" }]);
  };

  const remove = (id: string) => {
    setTeam((prev) => prev.filter((m) => m.id !== id));
  };

  const setRole = (id: string, role: string) => {
    setTeam((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
  };

  const move = (index: number, dir: -1 | 1) => {
    setTeam((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`${API_URL}/api/admin/discord/team`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members: team }),
      });
      if (!r.ok) throw new Error(await r.text());
      setMsg({ text: t("team.saved"), ok: true });
    } catch (e: any) {
      setMsg({ text: e.message || "Erreur", ok: false });
    } finally {
      setSaving(false);
    }
  };

  const searchable = members.filter((m) => {
    if (team.some((x) => x.id === m.id)) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${m.global_name} ${m.username} ${m.nick || ""}`.toLowerCase().includes(q);
  }).slice(0, 100);

  return (
    <div className="p-6 md:p-8 w-full max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersRound className="w-6 h-6 text-primary" /> {t("team.title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("team.subtitle")}</p>
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
            {guild.icon && <Avatar className="w-10 h-10"><AvatarImage src={guild.icon} alt={guild.name} /></Avatar>}
            <div>
              <p className="font-semibold">{guild.name}</p>
              <p className="text-xs text-muted-foreground">
                {guild.memberCount ?? "?"} membres · {guild.presenceCount ?? "?"} en ligne
              </p>
            </div>
            <span className="ml-auto text-sm text-muted-foreground">{team.length} membre{team.length > 1 ? "s" : ""}</span>
          </CardContent>
        </Card>
      )}

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {msg && (
        <Alert variant={msg.ok ? "default" : "destructive"}>
          <AlertDescription>{msg.text}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <p className="text-muted-foreground text-sm">{t("team.loading")}</p>
      ) : (
        <>
          {/* Équipe actuelle */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="font-semibold">{t("team.members")} — {team.length}</h2>
              {team.length === 0 && <p className="text-sm text-muted-foreground">{t("team.noMembers")}</p>}
              {team.map((tm, i) => {
                const d = memberOf(tm.id);
                return (
                  <div key={tm.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <Avatar className="w-10 h-10 shrink-0">
                      {d?.avatar && <AvatarImage src={d.avatar} alt={d.global_name} />}
                      <AvatarFallback className="bg-primary/15 text-primary font-bold">
                        {(d?.global_name || d?.username || "?").slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{d?.global_name || d?.username || tm.id}</p>
                      {d && d.nick && d.nick !== d.global_name && (
                        <p className="text-xs text-muted-foreground truncate">{d.nick}</p>
                      )}
                    </div>
                    <Input
                      value={tm.role}
                      onChange={(e) => setRole(tm.id, e.target.value)}
                      placeholder="Rôle (Fondateur, Admin…)"
                      className="max-w-[200px] h-9 text-sm"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} title="Monter">
                        <ChevronUp size={16} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === team.length - 1} title="Descendre">
                        <ChevronDown size={16} />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(tm.id)} title="Retirer">
                        <X size={16} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Ajouter un membre */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="relative max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("team.search")}
                  className="pl-9"
                />
              </div>
              <div className="max-h-[320px] overflow-y-auto space-y-1">
                {searchable.length === 0 && (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    {members.length === 0 ? t("team.noMembers") : t("team.noResults")}
                  </p>
                )}
                {searchable.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { add(m.id); setSearch(""); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-muted/30 border border-transparent hover:border-border"
                  >
                    <Avatar className="w-8 h-8 shrink-0">
                      {m.avatar && <AvatarImage src={m.avatar} alt={m.global_name} />}
                      <AvatarFallback className="bg-primary/15 text-primary font-bold">{m.global_name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{m.global_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.nick || m.username}</p>
                    </div>
                    {m.roles?.length > 0 && <Badge variant="outline" className="shrink-0 text-[10px]">{m.roles.length} rôle{m.roles.length > 1 ? "s" : ""}</Badge>}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}