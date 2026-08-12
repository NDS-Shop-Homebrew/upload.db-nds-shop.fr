import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { motion } from "framer-motion";
import { LogIn, ShieldCheck, Lock, LayoutDashboard, Hammer, Sparkles } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
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
      if (!result.ok) setError(result.message || "Identifiants incorrects");
    } catch {
      setError("Erreur de connexion au serveur");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0F172A]">
      {/* Panneau gauche — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#0072CE] via-[#0F5CA8] to-[#00A651]">
        <div className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:28px_28px]" />
        <div className="absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-20 -left-24 w-80 h-80 rounded-full bg-black/15 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg">
              <img src="/logo.png" alt="NDS-Shop" className="w-8 h-8 rounded-lg" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">NDS-Shop</span>
              <p className="text-[11px] text-white/60">Back-office</p>
            </div>
          </div>

          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-5 shadow-lg">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white leading-tight">
                Administration
                <br />
                NDS-Shop
              </h2>
              <p className="mt-3 text-white/75 max-w-sm leading-relaxed">
                Gérez la bibliothèque de jeux, les comptes de l'équipe et lancez les builds du site en toute sécurité.
              </p>
            </motion.div>

            <div className="space-y-3">
              {[
                { icon: LayoutDashboard, label: "Dashboard & statistiques" },
                { icon: Hammer, label: "Build du site en temps réel" },
                { icon: Lock, label: "Accès privé réservé à l'équipe" },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.1 }}
                  className="flex items-center gap-3 text-white/85 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 backdrop-blur"
                >
                  <item.icon size={16} className="text-white/70" />
                  <span className="text-sm">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <p className="text-white/40 text-xs">
            © {new Date().getFullYear()} NDS-Shop · Back-office · Accès réservé
          </p>
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex items-center justify-center p-6 bg-muted/30">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-sm"
        >
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <img src="/logo.png" alt="NDS-Shop" className="w-10 h-10 rounded-xl bg-primary" />
            <span className="text-xl font-bold tracking-tight">NDS-Shop</span>
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-sm p-8">
            <div className="mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-xl font-bold">Connexion</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Connectez-vous pour accéder au back-office.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-sm font-medium text-foreground">
                  Identifiant
                </label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Votre identifiant"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Mot de passe
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
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
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Se connecter
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6 flex items-center justify-center gap-1.5">
            <Sparkles size={12} /> Accès réservé à l'équipe NDS-Shop
          </p>
        </motion.div>
      </div>
    </div>
  );
}