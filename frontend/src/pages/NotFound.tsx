import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Ghost } from "lucide-react";
import { Button } from "../components/ui/button";
import { useUI } from "../context/UIContext";

export default function NotFound() {
  const { t } = useUI();
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 bg-transparent">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center text-center gap-8"
      >
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Ghost className="w-40 h-40 text-muted-foreground/30" />
          </motion.div>
          <h1 className="absolute text-7xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-primary to-accent select-none drop-shadow-sm">
            {t("notFound.title")}
          </h1>
        </div>

        <div className="flex flex-col gap-3 max-w-lg mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            {t("notFound.message")}
          </h2>
          <p className="text-lg text-muted-foreground font-medium">
            {t("notFound.description")}
          </p>
        </div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="pt-4"
        >
          <Button asChild className="gap-3 px-8 py-6 rounded-2xl font-bold shadow-lg hover:shadow-xl">
            <Link to="/">
              <Home className="size-5" />
              {t("notFound.back")}
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
