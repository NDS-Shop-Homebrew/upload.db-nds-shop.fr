import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "./ui/navigation-menu";
import { Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { DarkModeToggle } from "./DarkModeToggle";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, logout } = useAuth();

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
          <span>Upload NDS-Shop</span>
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
                <Link to="/dashboard">Dashboard</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <DarkModeToggle />
            </NavigationMenuItem>
            {isAuthenticated && (
              <NavigationMenuItem>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="gap-2"
                >
                  <LogOut size={18} />
                  Déconnexion
                </Button>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="md:hidden flex items-center gap-4 z-50">
          <DarkModeToggle />
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <div
        ref={menuRef}
        className={`md:hidden absolute top-full left-0 w-full flex flex-col items-start gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700 transition-all origin-top ${
          menuOpen
            ? "scale-y-100 opacity-100"
            : "scale-y-0 opacity-0 pointer-events-none"
        } bg-white dark:bg-gray-900 shadow-lg`}
      >
        <Link
          to="/"
          onClick={() => setMenuOpen(false)}
          className="w-full font-medium py-2"
        >
          Accueil
        </Link>
        {isAuthenticated && (
          <Button
            variant="outline"
            className="w-full justify-start gap-2 mt-2"
            onClick={() => {
              logout();
              setMenuOpen(false);
            }}
          >
            <LogOut size={18} />
            Déconnexion
          </Button>
        )}
      </div>
    </header>
  );
}
