import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Spinner } from "../components/ui/spinner";
import { Alert, AlertDescription } from "../components/ui/alert";
import { motion } from "framer-motion";
import { LogIn, ShieldCheck, Lock } from "lucide-react";
import { DarkModeToggle } from "../components/DarkModeToggle";
import { LangToggle } from "../components/LangToggle";
import { useUI } from "../context/UIContext";

export default function Login() {
  const { login } = useAuth();
  const { t } = useUI();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = await login(username, password);
      if (!result.ok) setError(t("login.error"));
    } catch {
      setError(t("login.serverError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0F172A]">
      {/* Panneau gauche — branding épuré */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#0072CE] via-[#0F5CA8] to-[#00A651]">
        <div className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:28px_28px]" />
        <div className="absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg">
              <img src="/logo.png" alt="NDS-Shop" className="w-8 h-8 rounded-lg" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">NDS-Shop</span>
              <p className="text-[11px] text-white/60">{t("nav.backoffice")}</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-5 shadow-lg">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              {t("login.adminTitle")}
              <br />
              NDS-Shop
            </h2>
            <p className="mt-3 text-white/75 max-w-sm leading-relaxed">{t("login.tagline")}</p>
          </motion.div>

          <p className="text-white/40 text-xs">
            © {new Date().getFullYear()} NDS-Shop · {t("login.reserved")}
          </p>
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex items-center justify-center p-6 bg-muted/30 relative">
        <div className="absolute top-6 right-6 flex items-center gap-2">
          <LangToggle />
          <DarkModeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-sm"
        >
          <div className="bg-card border border-border rounded-2xl shadow-sm p-8">
            <div className="mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-xl font-bold">{t("login.title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t("login.subtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">{t("login.username")}</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={t("login.usernamePh")}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">{t("login.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("login.passwordPh")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="h-11"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isLoading || !username || !password}
                className="w-full h-11 gap-2 font-semibold mt-2"
              >
                {isLoading ? (
                  <>
                    <Spinner className="size-4" />
                    {t("login.loading")}
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    {t("login.button")}
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            {t("login.reserved")}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
