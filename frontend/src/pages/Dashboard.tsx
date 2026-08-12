import { useEffect, useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Users, Gamepad2, FileArchive, Image as ImageIcon, Download, Rocket,
  CheckCircle2, XCircle, Plus, Shield, User as UserIcon,
} from "lucide-react";
import { authClient } from "../lib/auth-client";
import { useAuth } from "../context/AuthContext";

interface Stats {
  users: number;
  games: number;
  forwarders: number;
  screenshots: number;
  downloads: { total: number; today: number; nds: number; cia: number; byGame: Record<string, number> };
  lastBuild: { at: string | null; ok: boolean | null } | null;
}

interface AdminUser {
  id: string;
  username: string;
  name: string | null;
  email: string;
  role: string;
  banned: boolean;
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || "";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "member" });
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const isSuperAdmin = user?.role === "super-admin";

  const load = async () => {
    setError(null);
    try {
      const s = await fetch(`${API_URL}/api/admin/stats`, { credentials: "include" });
      if (!s.ok) throw new Error("stats: " + s.status);
      setStats(await s.json());
      if (isSuperAdmin || user?.role === "admin") {
        const u = await fetch(`${API_URL}/api/admin/users`, { credentials: "include" });
        if (u.ok) setUsers(await u.json());
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const createUser = async () => {
    setMsg(null);
    const { error } = await (authClient.admin.createUser as any)({
      username: newUser.username,
      email: `${newUser.username}@nds-shop.local`,
      name: newUser.username,
      password: newUser.password,
      role: newUser.role,
    });
    if (error) return setMsg({ text: error.message || "Erreur", ok: false });
    setMsg({ text: "Utilisateur créé", ok: true });
    setShowCreate(false);
    setNewUser({ username: "", password: "", role: "member" });
    load();
  };

  const setRole = async (userId: string, role: string) => {
    const { error } = await (authClient.admin.setRole as any)({ userId, role });
    if (!error) load();
  };

  const setPassword = async (userId: string) => {
    const pwd = prompt("Nouveau mot de passe :");
    if (!pwd) return;
    const { error } = await authClient.admin.setUserPassword({ userId, newPassword: pwd });
    setMsg(error ? { text: error.message || "Erreur", ok: false } : { text: "Mot de passe mis à jour", ok: true });
  };

  const banUser = async (userId: string, banned: boolean) => {
    if (banned) await authClient.admin.unbanUser({ userId });
    else await authClient.admin.banUser({ userId });
    load();
  };

  const statCards = stats ? [
    { icon: Users, label: "Utilisateurs", value: stats.users },
    { icon: Gamepad2, label: "Jeux", value: stats.games },
    { icon: FileArchive, label: "Forwarders", value: stats.forwarders },
    { icon: ImageIcon, label: "Screenshots", value: stats.screenshots },
    { icon: Download, label: "Téléchargements (30j)", value: stats.downloads.total },
    { icon: Download, label: "Téléchargements (auj.)", value: stats.downloads.today },
  ] : [];

  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Connecté en tant que <strong>{user?.username}</strong> · rôle{" "}
            <Badge variant={isSuperAdmin ? "default" : "secondary"}>{user?.role}</Badge>
          </p>
        </div>
        <Button onClick={load} variant="outline" size="sm">Rafraîchir</Button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
      {msg && (
        <p className={`text-sm rounded-lg p-3 ${msg.ok ? "text-green-700 bg-green-50 border border-green-200" : "text-red-600 bg-red-50 border border-red-200"}`}>
          {msg.text}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <c.icon size={14} /> {c.label}
              </div>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dernier build */}
      {stats?.lastBuild && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Rocket size={18} className="text-primary" />
            <span className="text-sm">
              Dernier build :{" "}
              {stats.lastBuild.ok === null ? "—" : stats.lastBuild.ok
                ? <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle2 size={14} /> Succès</span>
                : <span className="inline-flex items-center gap-1 text-red-600"><XCircle size={14} /> Échec</span>}
              {stats.lastBuild.at && <span className="text-muted-foreground"> · {new Date(stats.lastBuild.at).toLocaleString()}</span>}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Top téléchargements */}
      {stats?.downloads && Object.keys(stats.downloads.byGame).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Top téléchargements</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {Object.entries(stats.downloads.byGame)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([game, count]) => (
                  <div key={game} className="flex justify-between text-sm border-b border-border/50 pb-1">
                    <span className="truncate">{game}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gestion utilisateurs (super-admin) */}
      {isSuperAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users size={16} /> Gestion des utilisateurs
            </CardTitle>
            <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="gap-1.5">
              <Plus size={14} /> Créer
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {showCreate && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-muted/50 rounded-lg">
                <Input placeholder="Username" value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
                <Input placeholder="Mot de passe" type="password" value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                <select value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                  <option value="super-admin">super-admin</option>
                </select>
                <Button onClick={createUser} disabled={!newUser.username || !newUser.password}>Créer</Button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="p-2">Username</th>
                    <th className="p-2 hidden md:table-cell">Email</th>
                    <th className="p-2">Rôle</th>
                    <th className="p-2">Statut</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border/50">
                      <td className="p-2 font-medium flex items-center gap-2">
                        {u.role === "super-admin" ? <Shield size={14} className="text-primary" /> : <UserIcon size={14} className="text-muted-foreground" />}
                        {u.username}
                      </td>
                      <td className="p-2 hidden md:table-cell text-muted-foreground">{u.email}</td>
                      <td className="p-2">
                        {u.role === "super-admin" ? (
                          <Badge>{u.role}</Badge>
                        ) : (
                          <select value={u.role} onChange={(e) => setRole(u.id, e.target.value)}
                            className="h-8 rounded border border-input bg-background px-2 text-xs">
                            <option value="member">member</option>
                            <option value="admin">admin</option>
                            <option value="super-admin">super-admin</option>
                          </select>
                        )}
                      </td>
                      <td className="p-2">
                        <Badge variant={u.banned ? "destructive" : "outline"}>{u.banned ? "Banni" : "Actif"}</Badge>
                      </td>
                      <td className="p-2 text-right space-x-1">
                        {u.role !== "super-admin" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setPassword(u.id)}>MDP</Button>
                            <Button size="sm" variant="outline"
                              onClick={() => banUser(u.id, u.banned)}>
                              {u.banned ? "Débannir" : "Bannir"}
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
