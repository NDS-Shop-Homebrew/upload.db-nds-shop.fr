import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Settings as SettingsIcon, User, KeyRound, Mail, Sun, Moon, Languages } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import { authClient } from "../lib/auth-client";

export default function Settings() {
  const { user } = useAuth();
  const { t, darkMode, toggleDarkMode, lang, toggleLang } = useUI();
  const [name, setName] = useState(user?.username || "");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const updateProfile = async () => {
    setMsg(null);
    const { error } = await authClient.updateUser({ name });
    setMsg(error ? { text: error.message || "Erreur", ok: false } : { text: t("settings.saved"), ok: true });
  };

  const changePassword = async () => {
    setMsg(null);
    if (newPwd !== confirmPwd) return setMsg({ text: t("settings.passwordMismatch"), ok: false });
    const { error } = await (authClient.changePassword as any)({
      currentPassword: currentPwd,
      newPassword: newPwd,
      revokeOtherSessions: true,
    });
    setMsg(error ? { text: error.message || "Erreur", ok: false } : { text: t("settings.passwordChanged"), ok: true });
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
  };

  return (
    <div className="p-6 md:p-8 w-full max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary" /> {t("settings.title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("settings.subtitle")}</p>
      </div>

      {msg && (
        <p className={`text-sm rounded-lg p-3 ${msg.ok ? "text-green-700 bg-green-50 border border-green-200" : "text-red-600 bg-red-50 border border-red-200"}`}>
          {msg.text}
        </p>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><User size={16} /> {t("settings.profile")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">{t("settings.username")}</Label>
            <Input id="username" value={user?.username || ""} disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">{t("settings.usernameNote")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">{t("settings.name")}</Label>
            <Input id="name" placeholder={t("settings.namePh")} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="flex items-center gap-1.5"><Mail size={14} /> {t("settings.email")}</Label>
            <Input id="email" type="email" value={user?.email || ""} disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">{t("settings.emailNote")}</p>
          </div>
          <Button onClick={updateProfile}>{t("settings.save")}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sun size={16} /> {t("settings.preferences")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <button onClick={toggleDarkMode} className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors">
            <span className="flex items-center gap-2 text-sm">
              {darkMode ? <Moon size={16} className="text-primary" /> : <Sun size={16} className="text-primary" />}
              {t("settings.darkMode")}
            </span>
            <span className={`w-10 h-6 rounded-full transition-colors ${darkMode ? "bg-primary" : "bg-muted"}`}>
              <span className={`block w-4 h-4 mt-1 ml-1 rounded-full bg-background border border-border transition-transform ${darkMode ? "translate-x-4" : ""}`} />
            </span>
          </button>
          <button onClick={toggleLang} className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors">
            <span className="flex items-center gap-2 text-sm">
              <Languages size={16} className="text-primary" />
              {t("settings.language")}
            </span>
            <span className="text-sm font-medium">{lang === "fr" ? "Français" : "English"}</span>
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound size={16} /> {t("settings.changePassword")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current">{t("settings.currentPassword")}</Label>
            <Input id="current" type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new">{t("settings.newPassword")}</Label>
            <Input id="new" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">{t("settings.confirmPassword")}</Label>
            <Input id="confirm" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
          </div>
          <Button onClick={changePassword} disabled={!currentPwd || !newPwd || !confirmPwd}>
            {t("settings.changePassword")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
