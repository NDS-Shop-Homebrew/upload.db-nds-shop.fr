import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Gamepad2, Users, UsersRound, Hammer, Settings, LogOut, BarChart3, Inbox,
} from "lucide-react";
import { DarkModeToggle } from "./DarkModeToggle";
import { LangToggle } from "./LangToggle";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarRail, SidebarTrigger,
} from "./ui/sidebar";

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const { t } = useUI();
  const location = useLocation();

  const navItems = [
    { to: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard, adminOnly: false },
    { to: "/stats", label: t("nav.stats"), icon: BarChart3, adminOnly: false },
    { to: "/games", label: t("nav.games"), icon: Gamepad2, adminOnly: false },
    { to: "/requests", label: t("requests.title"), icon: Inbox, adminOnly: false },
    { to: "/users", label: t("nav.users"), icon: Users, adminOnly: true },
    { to: "/team", label: t("nav.team"), icon: UsersRound, adminOnly: true },
    { to: "/build", label: t("nav.build"), icon: Hammer, adminOnly: false },
    { to: "/settings", label: t("nav.settings"), icon: Settings, adminOnly: false },
  ];

  const visibleNav = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <a href="/">
                  <img src="/logo.png" alt="NDS-Shop" className="size-8 rounded-lg" />
                  <div className="group-data-[collapsible=icon]:hidden min-w-0">
                    <p className="font-bold leading-tight truncate">NDS-Shop</p>
                    <p className="text-xs text-muted-foreground">{t("nav.backoffice")}</p>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t("nav.menu")}</SidebarGroupLabel>
            <SidebarMenu>
              {visibleNav.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.to} tooltip={item.label} className="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary data-[active=true]:hover:text-primary-foreground">
                    <NavLink to={item.to}>
                      <item.icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="cursor-default">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold">
                  {user?.username?.slice(0, 2).toUpperCase() || "?"}
                </div>
                <div className="group-data-[collapsible=icon]:hidden min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user?.username}</p>
                  <Badge variant={isAdmin ? "default" : "secondary"} className="mt-0.5">
                    {user?.role}
                  </Badge>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <div className="group-data-[collapsible=icon]:justify-center flex items-center gap-1 p-2">
                <div className="group-data-[collapsible=icon]:hidden flex items-center gap-1">
                  <DarkModeToggle />
                  <LangToggle />
                </div>
                <Button variant="ghost" size="icon" onClick={logout} title={t("nav.logout")} className="text-muted-foreground hover:text-destructive">
                  <LogOut />
                </Button>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b bg-card px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <LangToggle />
          <DarkModeToggle />
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}