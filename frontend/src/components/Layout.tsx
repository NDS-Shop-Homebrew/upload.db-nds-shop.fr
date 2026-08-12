import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Gamepad2, Users, Hammer, Settings, LogOut, Menu, X,
} from "lucide-react";
import { DarkModeToggle } from "./DarkModeToggle";
import { useAuth } from "../context/AuthContext";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { to: "/games", label: "Bibliothèque", icon: Gamepad2, adminOnly: false },
  { to: "/users", label: "Utilisateurs", icon: Users, adminOnly: true },
  { to: "/build", label: "Build", icon: Hammer, adminOnly: false },
  { to: "/settings", label: "Paramètres", icon: Settings, adminOnly: false },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const visibleNav = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-card border-r border-border shrink-0 sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-border">
          <img src="/logo.png" alt="NDS-Shop" className="w-8 h-8 rounded-lg" />
          <div className="min-w-0">
            <p className="font-bold leading-tight truncate">NDS-Shop</p>
            <p className="text-xs text-muted-foreground">Back-office</p>
          </div>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">
              {user?.username?.slice(0, 2).toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <Badge variant={isAdmin ? "default" : "secondary"} className="mt-0.5">
                {user?.role}
              </Badge>
            </div>
            <button onClick={logout} className="p-2 rounded-lg text-muted-foreground hover:text-destructive transition-colors" title="Déconnexion">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Topbar mobile */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-40 bg-card border-b border-border h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="NDS-Shop" className="w-7 h-7 rounded-lg" />
            <span className="font-bold">NDS-Shop</span>
          </div>
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-muted">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </header>

        {/* Sidebar mobile overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setSidebarOpen(false)}>
            <div className="w-64 h-full bg-card border-r border-border p-4" onClick={(e) => e.stopPropagation()}>
              <nav className="space-y-1">
                {visibleNav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )
                    }
                  >
                    <item.icon size={18} />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <button
                onClick={logout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive transition-colors mt-4"
              >
                <LogOut size={18} /> Déconnexion
              </button>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}