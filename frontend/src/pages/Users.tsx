import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "../components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
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
  const { user: me, isSuperAdmin } = useAuth();
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
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);

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
    const { error } = await (authClient.admin.removeUser as any)({ userId: u.id });
    notify(error ? error.message || "Erreur" : t("users.deleted"), !error);
    setDeletingUser(null);
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

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {msg && (
        <Alert variant={msg.ok ? "default" : "destructive"}>
          <AlertDescription>{msg.text}</AlertDescription>
        </Alert>
      )}

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("users.search")}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-left text-muted-foreground">
                <TableHead>{t("users.username")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("users.email")}</TableHead>
                <TableHead>{t("users.role")}</TableHead>
                <TableHead>{t("users.status")}</TableHead>
                <TableHead className="text-right">{t("users.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      {u.role === "admin" ? <Shield size={14} className="text-primary" /> : <UserIcon size={14} className="text-muted-foreground" />}
                      <span>{u.username}</span>
                      {u.id === me?.id && <Badge variant="outline" className="text-[10px]">me</Badge>}
                      {u.name && u.name !== u.username && (
                        <span className="text-muted-foreground font-normal text-xs">({u.name})</span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    {u.role === "admin" || u.role === "super-admin" ? (
                      <Badge>{u.role}</Badge>
                    ) : isSuperAdmin ? (
                      <Select value={u.role} onValueChange={(v) => setRole(u.id, v)}>
                        <SelectTrigger className="h-8 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">member</SelectItem>
                          <SelectItem value="admin">admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">member</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.banned ? "destructive" : "outline"}>{u.banned ? t("users.banned") : t("users.active")}</Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <span className="inline-flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => { setEditUser(u); setEditName(u.name || u.username); }} title={t("users.edit")}>
                        <Pencil size={13} />
                      </Button>
                      {u.role !== "admin" && u.role !== "super-admin" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => { setPwdUser(u); setNewPassword(""); }} title={t("users.setPassword")}>
                            <Lock size={13} />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => banUser(u)} title={u.banned ? t("users.unban") : t("users.ban")}>
                            <Ban size={13} />
                          </Button>
                        </>
                      )}
                      {isSuperAdmin && u.id !== me?.id && (
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDeletingUser(u)} title={t("users.delete")}>
                          <Trash2 size={13} />
                        </Button>
                      )}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">{t("users.noResults")}</p>
          )}
        </CardContent>
      </Card>

      {/* Dialog Créer */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.createTitle")}</DialogTitle>
          </DialogHeader>
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
              <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">member</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t("users.cancel")}</Button>
            <Button onClick={createUser} disabled={!newUser.username || !newUser.password}>{t("users.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Éditer */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.edit")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">{t("users.name")}</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>{t("users.cancel")}</Button>
            <Button onClick={saveEdit}>{t("users.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Mot de passe */}
      <Dialog open={!!pwdUser} onOpenChange={(o) => !o && setPwdUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.setPassword")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">{t("users.newPassword")}</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdUser(null)}>{t("users.cancel")}</Button>
            <Button onClick={savePassword} disabled={!newPassword}>{t("users.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Suppression */}
      <AlertDialog open={!!deletingUser} onOpenChange={(o) => !o && setDeletingUser(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("users.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("users.confirmDelete")} "{deletingUser?.username}" ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingUser(null)}>{t("users.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => deletingUser && removeUser(deletingUser)}>
              {t("users.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}