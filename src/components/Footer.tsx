import {
  Twitter as TwitterIcon,
  GitHub as GitHubIcon,
} from "@mui/icons-material";

export default function Footer() {
  const version = import.meta.env.VITE_APP_VERSION || "dev";

  return (
    <footer className="border-t border-gray-700 px-6 py-8 mt-16">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="text-center md:text-left">
          <span className="text-2xl font-bold tracking-tight select-none">
            NDS-Shop
          </span>
          <p className="mt-2 text-sm text-gray-400 select-none">
            &copy; {new Date().getFullYear()}
          </p>
        </div>

        <div className="flex gap-6 mt-4 justify-center w-full">
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-blue-400 transition-colors"
          >
            <TwitterIcon fontSize="large" />
          </a>
          <a
            href="https://github.com/TheRinzler65"
            target="_blank"
            rel="noreferrer"
            className="hover:text-gray-200 transition-colors"
          >
            <GitHubIcon fontSize="large" />
          </a>
        </div>

        <div className="text-center md:text-right text-gray-400 text-xs select-none flex flex-col md:flex-row md:items-center gap-2">
          <div>
            <p>
              <a href="http://github.com/TheRinzler65" target="_blank" rel="noreferrer" className="underline hover:text-indigo-300">Rinzler</a>
            </p>
            <p className="mt-1">
              Version : {version}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
