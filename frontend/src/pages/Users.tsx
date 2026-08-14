import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Modal } from "../components/ui/modal";
import { Users as UsersIcon, Plus, Shield, User as UserIcon, Trash2, Ban, Lock, Pencil, Search } from "lucide-react";
import { authClient } from "../lib/auth-client";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";

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
  const { user: me } = useAuth();
  const { t } = useUI();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [search, setSearch] = useState("");

  // Modales
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "member" });
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [pwdUser, setPwdUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const load = async () => {
    try {
      const u = await fetch(`${API_URL}/api/admin/users`, { credentials: "include" });
      if (u.ok) setUsers(await u.json());
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) =>
      u.username.toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const notify = (text: string, ok = true) => setMsg({ text, ok });

  const createUser = async () => {
    const { error } = await (authClient.admin.createUser as any)({
      email: `${newUser.username}@nds-shop.local`,
      name: newUser.username,
      password: newUser.password,
      role: newUser.role,
      data: { username: newUser.username },
    });
    if (error) return notify(error.message || "Erreur", false);
    notify(t("users.created"));
    setShowCreate(false);
    setNewUser({ username: "", password: "", role: "member" });
    load();
  };

  const setRole = async (userId: string, role: string) => {
    const { error } = await (authClient.admin.setRole as any)({ userId, role });
    if (!error) load();
  };

  const saveEdit = async () => {
    if (!editUser) return;
    const { error } = await (authClient.admin.updateUser as any)({
      userId: editUser.id,
      data: { name: editName, email: editUser.email },
    });
    if (error) return notify(error.message || "Erreur", false);
    notify(t("users.updated"));
    setEditUser(null);
    load();
  };

  const savePassword = async () => {
    if (!pwdUser) return;
    const { error } = await authClient.admin.setUserPassword({ userId: pwdUser.id, newPassword });
    if (error) return notify(error.message || "Erreur", false);
    notify(t("users.passwordUpdated"));
    setPwdUser(null);
    setNewPassword("");
  };

  const banUser = async (u: AdminUser) => {
    if (u.id === me?.id) return notify(t("users.cannotBanSelf"), false);
    if (u.banned) await authClient.admin.unbanUser({ userId: u.id });
    else await authClient.admin.banUser({ userId: u.id });
    load();
  };

  const removeUser = async (u: AdminUser) => {
    if (u.id === me?.id) return notify(t("users.cannotDeleteSelf"), false);
    if (!confirm(`${t("users.confirmDelete")} "${u.username}" ?`)) return;
    const { error } = await (authClient.admin.removeUser as any)({ userId: u.id });
    notify(error ? error.message || "Erreur" : t("users.deleted"), !error);
    load();
  };

  return (
    <div className="p-6 md:p-8 w-full max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-primary" /> {t("users.title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("users.subtitle")}</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus size={14} /> {t("users.create")}
        </Button>
      </div>

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
          placeholder={t("users.search")}
          className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="p-3">{t("users.username")}</th>
                  <th className="p-3 hidden md:table-cell">{t("users.email")}</th>
                  <th className="p-3">{t("users.role")}</th>
                  <th className="p-3">{t("users.status")}</th>
                  <th className="p-3 text-right">{t("users.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 font-medium flex items-center gap-2">
                      {u.role === "admin" ? <Shield size={14} className="text-primary" /> : <UserIcon size={14} className="text-muted-foreground" />}
                      <span>{u.username}</span>
                      {u.id === me?.id && <Badge variant="outline" className="text-[10px]">me</Badge>}
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
                      <Badge variant={u.banned ? "destructive" : "outline"}>{u.banned ? t("users.banned") : t("users.active")}</Badge>
                    </td>
                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => { setEditUser(u); setEditName(u.name || u.username); }} title={t("users.edit")}>
                        <Pencil size={13} />
                      </Button>
                      {u.role !== "admin" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => { setPwdUser(u); setNewPassword(""); }} title={t("users.setPassword")}>
                            <Lock size={13} />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => banUser(u)} title={u.banned ? t("users.unban") : t("users.ban")}>
                            <Ban size={13} />
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => removeUser(u)} title={t("users.delete")}>
                            <Trash2 size={13} />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">{t("users.noResults")}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal Créer */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t("users.createTitle")}>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">{t("users.username")}</label>
            <Input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">{t("users.password")}</label>
            <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">{t("users.role")}</label>
            <select value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t("users.cancel")}</Button>
            <Button onClick={createUser} disabled={!newUser.username || !newUser.password}>{t("users.save")}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Éditer */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={t("users.edit")}>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">{t("users.name")}</label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditUser(null)}>{t("users.cancel")}</Button>
            <Button onClick={saveEdit}>{t("users.save")}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Mot de passe */}
      <Modal open={!!pwdUser} onClose={() => setPwdUser(null)} title={t("users.setPassword")}>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">{t("users.newPassword")}</label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPwdUser(null)}>{t("users.cancel")}</Button>
            <Button onClick={savePassword} disabled={!newPassword}>{t("users.save")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
