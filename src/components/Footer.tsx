import {
  Twitter as TwitterIcon,
  GitHub as GitHubIcon,
} from "@mui/icons-material";
import { DarkModeToggle } from "./DarkModeToggle";

export default function Footer() {
  const version = import.meta.env.VITE_APP_VERSION || "dev";

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-300 py-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 px-6">
        <div className="flex flex-col items-center md:items-start">
          <span className="text-2xl font-extrabold select-none text-gray-900 dark:text-white">
            NDS-Shop.
          </span>
          <span className="text-sm mt-1 select-none text-gray-600 dark:text-gray-400">
            &copy; {new Date().getFullYear()} NDS-Shop. Tout droits réservés.
          </span>
        </div>

        <div className="flex gap-6">
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          >
            <TwitterIcon fontSize="large" />
          </a>
          <a
            href="https://github.com/TheRinzler65"
            target="_blank"
            rel="noreferrer"
            className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <GitHubIcon fontSize="large" />
          </a>
        </div>

        <div className="flex flex-col items-center md:items-end text-xs gap-1">
          <a
            href="https://github.com/TheRinzler65"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            Rinzler
          </a>
          <span className="text-gray-600 dark:text-gray-400">
            Version: {version}
          </span>
          <DarkModeToggle />
        </div>
      </div>
    </footer>
  );
}
