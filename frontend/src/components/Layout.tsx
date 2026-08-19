import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Gamepad2, Users, UsersRound, Hammer, Settings, LogOut, Menu, X, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { DarkModeToggle } from "./DarkModeToggle";
import { LangToggle } from "./LangToggle";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const { t } = useUI();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("uploadNavCollapsed") === "1");
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem("uploadNavCollapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const navItems = [
    { to: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard, adminOnly: false },
    { to: "/games", label: t("nav.games"), icon: Gamepad2, adminOnly: false },
    { to: "/users", label: t("nav.users"), icon: Users, adminOnly: true },
    { to: "/team", label: t("nav.team"), icon: UsersRound, adminOnly: true },
    { to: "/build", label: t("nav.build"), icon: Hammer, adminOnly: false },
    { to: "/settings", label: t("nav.settings"), icon: Settings, adminOnly: false },
  ];

  const visibleNav = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar desktop */}
      <aside className={cn("hidden lg:flex flex-col bg-card border-r border-border shrink-0 sticky top-0 h-screen transition-all duration-200", collapsed ? "w-16" : "w-60")}>
        <div className={cn("flex items-center gap-2 px-5 h-16 border-b border-border", collapsed && "justify-center px-0")}>
          <img src="/logo.png" alt="NDS-Shop" className="w-8 h-8 rounded-lg shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-bold leading-tight truncate">NDS-Shop</p>
              <p className="text-xs text-muted-foreground">{t("nav.backoffice")}</p>
            </div>
          )}
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-0"
                )
              }
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          {!collapsed && (
            <div className="flex items-center gap-2 px-2">
              <div className="flex-1 flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">
                  {user?.username?.slice(0, 2).toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user?.username}</p>
                  <Badge variant={isAdmin ? "default" : "secondary"} className="mt-0.5">
                    {user?.role}
                  </Badge>
                </div>
              </div>
              <DarkModeToggle />
              <button onClick={logout} className="p-2 rounded-lg text-muted-foreground hover:text-destructive transition-colors" title={t("nav.logout")}>
                <LogOut size={18} />
              </button>
            </div>
          )}
          {collapsed && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">
                {user?.username?.slice(0, 2).toUpperCase() || "?"}
              </div>
              <button onClick={logout} className="p-2 rounded-lg text-muted-foreground hover:text-destructive transition-colors" title={t("nav.logout")}>
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-16 -right-3 z-10 p-1 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground shadow"
          title={collapsed ? "Déplier" : "Replier"}
        >
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </aside>

      {/* Topbar mobile */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-40 bg-card border-b border-border h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="NDS-Shop" className="w-7 h-7 rounded-lg" />
            <span className="font-bold">NDS-Shop</span>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
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
                <LogOut size={18} /> {t("nav.logout")}
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
