import { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  ArrowLeft,
  Wrench,
  Clock,
  ChevronDown,
  ChevronRight,
  Camera,
  Wallet,
  FolderKanban,
  Settings as SettingsIcon,
  Gauge,
  TrendingUp,
  Menu,
  Smartphone,
  KeyRound,
  QrCode,
  Package,
} from "lucide-react";

type LeafItem = {
  type: "leaf";
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
};

type GroupItem = {
  type: "group";
  key: string;
  label: string;
  icon: typeof LayoutDashboard;
  children: LeafItem[];
  /** Path prefixes that should auto-expand the group. */
  matchPrefixes: string[];
};

type NavItem = LeafItem | GroupItem;

const navItems: NavItem[] = [
  { type: "leaf", path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { type: "leaf", path: "/admin/files", label: "Files & Chunks", icon: FileText },
  { type: "leaf", path: "/admin/developers", label: "Developers", icon: Users },
  { type: "leaf", path: "/admin/finance", label: "Finance", icon: TrendingUp },
  {
    type: "group",
    key: "time-tracker",
    label: "Time Tracker",
    icon: Clock,
    matchPrefixes: ["/admin/time-tracker", "/admin/projects"],
    children: [
      { type: "leaf", path: "/admin/time-tracker", label: "Dashboard", icon: Gauge },
      { type: "leaf", path: "/admin/time-tracker/screenshots", label: "Screenshots", icon: Camera },
      { type: "leaf", path: "/admin/time-tracker/payments", label: "Payments", icon: Wallet },
      { type: "leaf", path: "/admin/projects", label: "Projects", icon: FolderKanban },
      { type: "leaf", path: "/admin/time-tracker/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
  {
    type: "group",
    key: "tablet",
    label: "Tablet SaaS",
    icon: Smartphone,
    matchPrefixes: ["/admin/tablet"],
    children: [
      { type: "leaf", path: "/admin/tablet", label: "Dashboard", icon: Gauge },
      { type: "leaf", path: "/admin/tablet/keys", label: "License Keys", icon: KeyRound },
      { type: "leaf", path: "/admin/tablet/devices", label: "Devices", icon: Smartphone },
      { type: "leaf", path: "/admin/tablet/provisioning", label: "Provisioning", icon: QrCode },
      { type: "leaf", path: "/admin/tablet/apk-versions", label: "APK Versions", icon: Package },
    ],
  },
];

// Routes where sub-paths should NOT bubble the highlight back to the parent leaf.
// e.g. when on /admin/tablet/devices, /admin/tablet (Tablet > Dashboard) must NOT light up.
const EXACT_ONLY_PATHS = new Set([
  "/admin",
  "/admin/time-tracker",
  "/admin/tablet",
]);

const isLeafActive = (current: string, path: string) => {
  if (EXACT_ONLY_PATHS.has(path)) return current === path;
  return current === path || current.startsWith(path + "/");
};

const isGroupActive = (current: string, item: GroupItem) =>
  item.matchPrefixes.some((p) => current.startsWith(p));

const currentPageTitle = (current: string): string => {
  for (const item of navItems) {
    if (item.type === "leaf" && isLeafActive(current, item.path)) return item.label;
    if (item.type === "group") {
      for (const child of item.children) {
        if (isLeafActive(current, child.path)) return `${item.label} · ${child.label}`;
      }
    }
  }
  return "Admin";
};

interface NavListProps {
  current: string;
  openGroups: Record<string, boolean>;
  toggleGroup: (key: string) => void;
  onNavigate?: () => void;
}

const NavList = ({ current, openGroups, toggleGroup, onNavigate }: NavListProps) => (
  <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
    <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
      Workspace
    </p>
    {navItems.map((item) => {
      if (item.type === "leaf") {
        const Icon = item.icon;
        const active = isLeafActive(current, item.path);
        return (
          <Link key={item.path} to={item.path} onClick={onNavigate}>
            <div
              className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-foreground/80 hover:text-foreground hover:bg-muted"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-primary-foreground/70" />
              )}
              <Icon className={`w-4.5 h-4.5 shrink-0 ${active ? "" : "text-muted-foreground group-hover:text-foreground"}`} />
              <span className="font-medium">{item.label}</span>
            </div>
          </Link>
        );
      }
      const Icon = item.icon;
      const open = !!openGroups[item.key];
      const groupActive = isGroupActive(current, item);
      const Chevron = open ? ChevronDown : ChevronRight;
      return (
        <div key={item.key} className="pt-1">
          <button
            type="button"
            onClick={() => toggleGroup(item.key)}
            className={`group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
              groupActive
                ? "text-foreground bg-muted/60"
                : "text-foreground/80 hover:text-foreground hover:bg-muted"
            }`}
          >
            <Icon className={`w-4.5 h-4.5 shrink-0 ${groupActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
            <span className="flex-1 text-left font-medium">{item.label}</span>
            {groupActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
            <Chevron className="w-3.5 h-3.5 opacity-60 transition-transform" />
          </button>
          {open && (
            <div className="ml-4 mt-1 space-y-0.5 relative">
              <span className="absolute left-0 top-1 bottom-1 w-px bg-border" />
              {item.children.map((child) => {
                const ChildIcon = child.icon;
                const active = isLeafActive(current, child.path);
                return (
                  <Link key={child.path} to={child.path} onClick={onNavigate}>
                    <div
                      className={`relative ml-3 flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                        active
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {active && (
                        <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary border-2 border-background" />
                      )}
                      <ChildIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{child.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    })}
  </nav>
);

interface SidebarBodyProps extends NavListProps {
  email?: string | null;
  onLogout: () => void;
}

const SidebarBody = ({ current, openGroups, toggleGroup, onNavigate, email, onLogout }: SidebarBodyProps) => (
  <>
    <div className="p-4 border-b border-border/60">
      <Link
        to="/"
        onClick={onNavigate}
        className="group inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Back to site
      </Link>
      <Link to="/admin" onClick={onNavigate} className="flex items-center gap-2.5 group">
        <div className="relative w-9 h-9 rounded-xl bg-card border border-border inline-flex items-center justify-center shadow-md shadow-primary/10 overflow-hidden p-1">
          <img src="/assets/logonew.png" alt="Nap.AI" className="w-full h-full object-contain" />
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-md bg-background border border-border inline-flex items-center justify-center">
            <Wrench className="w-2 h-2 text-primary" />
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold leading-tight">Nap.AI Admin</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Control panel</p>
        </div>
      </Link>
    </div>
    <NavList current={current} openGroups={openGroups} toggleGroup={toggleGroup} onNavigate={onNavigate} />
    <div className="p-3 border-t border-border/60">
      <div className="rounded-xl bg-muted/40 border border-border/60 p-2.5 mb-2 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-primary/10 inline-flex items-center justify-center text-xs font-semibold text-primary shrink-0">
          {email?.[0]?.toUpperCase() ?? "A"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Signed in as</p>
          <p className="text-xs font-medium truncate" title={email ?? ""}>{email}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={onLogout}>
        <LogOut className="w-4 h-4 mr-2.5" />
        Sign out
      </Button>
    </div>
  </>
);

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const current = location.pathname;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const initialOpen: Record<string, boolean> = {};
  for (const item of navItems) {
    if (item.type === "group") {
      initialOpen[item.key] = item.matchPrefixes.some((p) => current.startsWith(p));
    }
  }
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen);
  const toggleGroup = (key: string) => setOpenGroups((s) => ({ ...s, [key]: !s[key] }));

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [current]);

  // Bottom bar: 4 leaf items + Time Tracker (opens drawer for full sub-nav).
  const bottomLeaves = navItems.filter((i): i is LeafItem => i.type === "leaf");
  const timeGroup = navItems.find((i): i is GroupItem => i.type === "group" && i.key === "time-tracker");

  return (
    <div className="min-h-screen bg-muted/20 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border/60 bg-background/80 backdrop-blur flex-col">
        <SidebarBody
          current={current}
          openGroups={openGroups}
          toggleGroup={toggleGroup}
          email={user?.email}
          onLogout={logout}
        />
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2" aria-label="Open menu">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <SidebarBody
                current={current}
                openGroups={openGroups}
                toggleGroup={toggleGroup}
                onNavigate={() => setDrawerOpen(false)}
                email={user?.email}
                onLogout={() => { setDrawerOpen(false); logout(); }}
              />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Wrench className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold text-sm truncate">{currentPageTitle(current)}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Logout">
            <LogOut className="w-4 h-4" />
          </Button>
        </header>

        {/* Page content — extra bottom padding on mobile to clear the bottom bar */}
        <main className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <ul className="grid grid-cols-5 h-16">
          {bottomLeaves.map((item) => {
            const Icon = item.icon;
            const active = isLeafActive(current, item.path);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`h-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? "" : "opacity-80"}`} />
                  <span className="truncate max-w-[72px]">{item.label}</span>
                </Link>
              </li>
            );
          })}
          {timeGroup && (
            <li>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className={`w-full h-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                  isGroupActive(current, timeGroup)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Clock className="w-5 h-5" />
                <span>Time</span>
              </button>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
};

export default AdminLayout;
