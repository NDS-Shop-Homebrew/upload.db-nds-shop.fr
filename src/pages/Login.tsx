import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { motion } from "framer-motion";
import { DarkModeToggle } from "../components/DarkModeToggle";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(username, password);
    if (!success) setError("❌ Identifiants incorrects");
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="w-96 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 shadow-2xl rounded-2xl text-gray-900 dark:text-gray-100">
          <CardHeader className="flex flex-col items-center space-y-2">
            <img
              src="/favicon.ico"
              alt="NDS-Shop Logo"
              className="w-12 h-12 mb-2"
            />
            <CardTitle className="text-center text-2xl font-bold tracking-wide">
              Connexion à NDS-Shop
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Identifiant"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500"
              />
              <Input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500"
              />

              {error && (
                <div className="p-2 text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 font-semibold text-white shadow-lg"
              >
                Se connecter
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Dark Mode Toggle avec espacement suffisant */}
      <div className="absolute bottom-8 right-8">
        <DarkModeToggle />
      </div>
    </div>
  );
}
