import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Ghost } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 bg-transparent">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center text-center space-y-8"
      >
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{
              y: [0, -15, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Ghost className="w-40 h-40 text-gray-200 dark:text-gray-800" />
          </motion.div>
          <h1 className="absolute text-7xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-500 select-none drop-shadow-sm">
            404
          </h1>
        </div>

        <div className="space-y-3 max-w-lg mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Oups ! Page introuvable.
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
            La page que vous recherchez n'existe pas, a été supprimée ou a été
            déplacée.
          </p>
        </div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="pt-4"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Home className="w-5 h-5" />
            Retour à l'accueil
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
