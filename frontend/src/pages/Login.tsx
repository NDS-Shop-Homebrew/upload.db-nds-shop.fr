import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { motion } from "framer-motion";
import { LogIn, ShieldCheck, Lock, Languages } from "lucide-react";

type Lang = "fr" | "en";

const translations = {
  fr: {
    backoffice: "Back-office",
    adminTitle: "Administration",
    adminTitle2: "NDS-Shop",
    tagline: "Espace d'administration du site NDS-Shop.",
    loginTitle: "Connexion",
    loginSubtitle: "Connectez-vous pour accéder au back-office.",
    username: "Identifiant",
    usernamePh: "Votre identifiant",
    password: "Mot de passe",
    passwordPh: "••••••••",
    error: "Identifiants incorrects",
    serverError: "Erreur de connexion au serveur",
    loading: "Connexion en cours...",
    login: "Se connecter",
    reserved: "Accès réservé à l'équipe NDS-Shop",
    copyright: "Accès réservé",
  },
  en: {
    backoffice: "Back-office",
    adminTitle: "Administration",
    adminTitle2: "NDS-Shop",
    tagline: "Administration area of the NDS-Shop website.",
    loginTitle: "Sign in",
    loginSubtitle: "Sign in to access the back-office.",
    username: "Username",
    usernamePh: "Your username",
    password: "Password",
    passwordPh: "••••••••",
    error: "Invalid credentials",
    serverError: "Connection error",
    loading: "Signing in...",
    login: "Sign in",
    reserved: "Access reserved to the NDS-Shop team",
    copyright: "Restricted access",
  },
};

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang] = useState<Lang>(() =>
    (localStorage.getItem("adminLang") as Lang) || "fr"
  );

  const t = translations[lang];

  const toggleLang = () => {
    const next: Lang = lang === "fr" ? "en" : "fr";
    setLang(next);
    localStorage.setItem("adminLang", next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = await login(username, password);
      if (!result.ok) setError(t.error);
    } catch {
      setError(t.serverError);
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
              <p className="text-[11px] text-white/60">{t.backoffice}</p>
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
              {t.adminTitle}
              <br />
              {t.adminTitle2}
            </h2>
            <p className="mt-3 text-white/75 max-w-sm leading-relaxed">{t.tagline}</p>
          </motion.div>

          <p className="text-white/40 text-xs">
            © {new Date().getFullYear()} NDS-Shop · {t.copyright}
          </p>
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex items-center justify-center p-6 bg-muted/30 relative">
        <button
          onClick={toggleLang}
          className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted transition-colors"
        >
          <Languages size={14} />
          {lang === "fr" ? "EN" : "FR"}
        </button>

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
              <h1 className="text-xl font-bold">{t.loginTitle}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t.loginSubtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-sm font-medium text-foreground">
                  {t.username}
                </label>
                <Input
                  id="username"
                  type="text"
                  placeholder={t.usernamePh}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  {t.password}
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t.passwordPh}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="h-11"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg"
                >
                  {error}
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !username || !password}
                className="w-full h-11 gap-2 font-semibold mt-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {t.loading}
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    {t.login}
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            {t.reserved}
          </p>
        </motion.div>
      </div>
    </div>
  );
}