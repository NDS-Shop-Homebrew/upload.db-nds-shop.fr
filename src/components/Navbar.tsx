import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "./ui/navigation-menu";
import { Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import {
  Menu as MenuIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { DarkModeToggle } from "./DarkModeToggle";

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="w-full px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 relative z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 text-2xl font-bold tracking-tight"
        >
          <img src="/favicon.ico" alt="NDS-Shop Logo" className="w-8 h-8" />
          <span>NDS-Shop</span>
        </Link>

        <NavigationMenu>
          <NavigationMenuList className="hidden md:flex gap-7 text-xl font-semibold items-center">
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link to="/">Accueil</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link to="/about">A Propos</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <DarkModeToggle />
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <button
          className="md:hidden z-50"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      <div
        ref={menuRef}
        className={`md:hidden absolute top-full left-0 w-full flex flex-col items-start gap-3 px-6 py-4 transition-transform origin-top ${
          menuOpen ? "scale-y-100" : "scale-y-0"
        } bg-white dark:bg-gray-900`}
      >
        <Link to="/" onClick={() => setMenuOpen(false)}>
          Accueil
        </Link>
        <Link to="/about" onClick={() => setMenuOpen(false)}>
          A Propos
        </Link>
        <div className="mt-4">
          <DarkModeToggle />
        </div>
      </div>
    </header>
  );
}
