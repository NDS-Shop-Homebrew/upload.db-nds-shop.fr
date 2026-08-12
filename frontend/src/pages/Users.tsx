import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Users as UsersIcon, Plus, Shield, User as UserIcon, Trash2, Ban, Lock, Pencil } from "lucide-react";
import { authClient } from "../lib/auth-client";

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

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "member" });
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = async () => {
    try {
      const u = await fetch(`${API_URL}/api/admin/users`, { credentials: "include" });
      if (u.ok) setUsers(await u.json());
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const createUser = async () => {
    setMsg(null);
    const { error } = await (authClient.admin.createUser as any)({
      email: `${newUser.username}@nds-shop.local`,
      name: newUser.username,
      password: newUser.password,
      role: newUser.role,
      data: { username: newUser.username },
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

  const editUser = async (u: AdminUser) => {
    const name = prompt("Nom complet :", u.name || "");
    if (name === null) return;
    const email = prompt("Email :", u.email);
    if (email === null) return;
    const { error } = await (authClient.admin.updateUser as any)({
      userId: u.id,
      data: { name, email },
    });
    setMsg(error ? { text: error.message || "Erreur", ok: false } : { text: "Infos mises à jour", ok: true });
    load();
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

  const removeUser = async (u: AdminUser) => {
    if (!confirm(`Supprimer définitivement "${u.username}" ?`)) return;
    const { error } = await (authClient.admin.removeUser as any)({ userId: u.id });
    setMsg(error ? { text: error.message || "Erreur", ok: false } : { text: "Utilisateur supprimé", ok: true });
    load();
  };

  return (
    <div className="p-6 md:p-8 w-full max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-primary" /> Utilisateurs
          </h1>
          <p className="text-muted-foreground text-sm">Gérez les comptes de l'équipe.</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="gap-1.5">
          <Plus size={14} /> Créer un compte
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
      {msg && (
        <p className={`text-sm rounded-lg p-3 ${msg.ok ? "text-green-700 bg-green-50 border border-green-200" : "text-red-600 bg-red-50 border border-red-200"}`}>
          {msg.text}
        </p>
      )}

      {showCreate && (
        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input placeholder="Username" value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
            <Input placeholder="Mot de passe" type="password" value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
            <select value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            <Button onClick={createUser} disabled={!newUser.username || !newUser.password}>Créer</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="p-3">Utilisateur</th>
                  <th className="p-3 hidden md:table-cell">Email</th>
                  <th className="p-3">Rôle</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 font-medium flex items-center gap-2">
                      {u.role === "admin" ? <Shield size={14} className="text-primary" /> : <UserIcon size={14} className="text-muted-foreground" />}
                      <span>{u.username}</span>
                      {u.name && u.name !== u.username && (
                        <span className="text-muted-foreground font-normal text-xs">({u.name})</span>
                      )}
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{u.email}</td>
                    <td className="p-3">
                      {u.role === "admin" ? (
                        <Badge>{u.role}</Badge>
                      ) : (
                        <select value={u.role} onChange={(e) => setRole(u.id, e.target.value)}
                          className="h-8 rounded border border-input bg-background px-2 text-xs">
                          <option value="member">member</option>
                          <option value="admin">admin</option>
                        </select>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant={u.banned ? "destructive" : "outline"}>{u.banned ? "Banni" : "Actif"}</Badge>
                    </td>
                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => editUser(u)} title="Modifier">
                        <Pencil size={13} />
                      </Button>
                      {u.role !== "admin" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setPassword(u.id)} title="Mot de passe">
                            <Lock size={13} />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => banUser(u.id, u.banned)} title={u.banned ? "Débannir" : "Bannir"}>
                            <Ban size={13} />
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => removeUser(u)} title="Supprimer">
                            <Trash2 size={13} />
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
    </div>
  );
}