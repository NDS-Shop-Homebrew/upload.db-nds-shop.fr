import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Settings as SettingsIcon, User, KeyRound, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authClient } from "../lib/auth-client";

export default function Settings() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.username || "");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const updateProfile = async () => {
    setMsg(null);
    const { error } = await authClient.updateUser({ name });
    setMsg(error ? { text: error.message || "Erreur", ok: false } : { text: "Profil mis à jour", ok: true });
  };

  const changePassword = async () => {
    setMsg(null);
    if (newPwd !== confirmPwd) return setMsg({ text: "Les mots de passe ne correspondent pas", ok: false });
    const { error } = await (authClient.changePassword as any)({
      currentPassword: currentPwd,
      newPassword: newPwd,
      revokeOtherSessions: true,
    });
    setMsg(error ? { text: error.message || "Erreur", ok: false } : { text: "Mot de passe changé", ok: true });
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
  };

  return (
    <div className="p-6 md:p-8 w-full max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary" /> Paramètres
        </h1>
        <p className="text-muted-foreground text-sm">Gérez votre profil et votre mot de passe.</p>
      </div>

      {msg && (
        <p className={`text-sm rounded-lg p-3 ${msg.ok ? "text-green-700 bg-green-50 border border-green-200" : "text-red-600 bg-red-50 border border-red-200"}`}>
          {msg.text}
        </p>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><User size={16} /> Profil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={user?.username || ""} disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">Le username ne peut pas être changé.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom complet</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="flex items-center gap-1.5"><Mail size={14} /> Email</Label>
            <Input id="email" type="email" value={user?.email || ""} disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">L'email est fixé et ne peut pas être modifié (sécurité).</p>
          </div>
          <Button onClick={updateProfile}>Enregistrer le profil</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound size={16} /> Changer le mot de passe</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current">Mot de passe actuel</Label>
            <Input id="current" type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new">Nouveau mot de passe</Label>
            <Input id="new" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirmer le nouveau mot de passe</Label>
            <Input id="confirm" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
          </div>
          <Button onClick={changePassword} disabled={!currentPwd || !newPwd || !confirmPwd}>
            Changer le mot de passe
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}