"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  Users,
  MessageSquare,
  FileText,
  Megaphone,
  Star,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Phone,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import { cn, fetchJson } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { NotificationBell } from "@/components/notification-bell";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

// Single shared hook — both Sidebar and MobileNav use the same cache key
function useSidebarCounts() {
  return useQuery<{ newLeads: number; pendingTasks: number; todayJobs: number }>({
    queryKey: ["sidebar-counts"],
    queryFn: () => fetchJson<{ newLeads: number; pendingTasks: number; todayJobs: number }>("/api/sidebar-counts"),
    refetchInterval: 5 * 60_000, // Every 5 min, not 60s
  });
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/calendar", label: "Schedule", icon: Calendar },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/conversations", label: "Messages", icon: MessageSquare },
  { href: "/invoicing", label: "Invoicing", icon: FileText },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/reviews", label: "Reviews", icon: Star },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN", "OWNER"] },
];

function SidebarNavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
        active
          ? "bg-emerald-500/15 text-emerald-400"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800",
        collapsed && "justify-center"
      )}
      title={collapsed ? label : undefined}
    >
      <span className="relative shrink-0">
        <Icon className={cn(collapsed ? "w-5 h-5" : "w-4.5 h-4.5")} />
        {collapsed && badge != null && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1">{label}</span>
          {badge != null && badge > 0 && (
            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const hasRole = (...roles: string[]) => roles.includes(session?.user?.role || "");
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  const { data: counts } = useSidebarCounts();

  const badgeMap: Record<string, number | undefined> = {
    "/jobs": counts?.todayJobs,
    "/conversations": counts?.newLeads,
  };

  const visibleItems = navItems.filter(
    (item) => !item.roles || hasRole(...item.roles)
  );

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      role="navigation"
      aria-label="Main navigation"
      className={cn(
        "hidden md:flex flex-col h-screen bg-slate-950 border-r border-slate-800 transition-all duration-200 shrink-0",
        collapsed ? "w-14" : "w-[220px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-slate-800">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">FP</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden flex-1">
            <div className="text-white font-semibold text-sm leading-tight truncate">
              Fresh Path
            </div>
            <div className="text-slate-500 text-xs truncate">Mobile Detailing</div>
          </div>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {!collapsed && <NotificationBell />}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <div className="space-y-0.5">
          {visibleItems.map((item) => (
            <SidebarNavItem
              key={item.href}
              {...item}
              active={isActive(item.href)}
              collapsed={collapsed}
              badge={badgeMap[item.href]}
            />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-2 pb-3 border-t border-slate-800 pt-3 space-y-0.5">
        <a
          href="https://voice.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all w-full",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Google Voice" : undefined}
        >
          <Phone className="w-4 h-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Google Voice</span>
              <ExternalLink className="w-3 h-3 text-slate-600" />
            </>
          )}
        </a>
        {!collapsed && (
          <button
            onClick={() => {
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all w-full"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">Search</span>
            <kbd className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </button>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all w-full",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const hasRole = (...roles: string[]) => roles.includes(session?.user?.role || "");
  const [open, setOpen] = useState(false);

  const { data: counts } = useSidebarCounts();

  const badgeMap: Record<string, number | undefined> = {
    "/jobs": counts?.todayJobs,
    "/conversations": counts?.newLeads,
  };

  const visibleItems = navItems.filter(
    (item) => !item.roles || hasRole(...item.roles)
  );

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // Bottom tab bar items — 5 key pages
  const bottomTabs: NavItem[] = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/jobs", label: "Jobs", icon: Briefcase },
    { href: "/conversations", label: "Messages", icon: MessageSquare },
    { href: "/customers", label: "Clients", icon: Users },
  ];

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-500 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">FP</span>
          </div>
          <span className="text-white font-semibold text-sm">Fresh Path</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={() => setOpen(true)}
            className="text-slate-400 hover:text-slate-200"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
            <div className="flex items-center justify-between px-4 py-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">FP</span>
                </div>
                <span className="text-white font-semibold">Fresh Path</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-3 overflow-y-auto">
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const badge = badgeMap[item.href];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                        isActive(item.href)
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      )}
                    >
                      <item.icon className="w-4.5 h-4.5 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {badge != null && badge > 0 && (
                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>
            <div className="px-3 pb-4 border-t border-slate-800 pt-4 space-y-1">
              <a
                href="https://voice.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all w-full"
              >
                <Phone className="w-4.5 h-4.5 shrink-0" />
                <span className="flex-1">Google Voice</span>
                <ExternalLink className="w-3 h-3 text-slate-600" />
              </a>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all w-full"
              >
                <LogOut className="w-4.5 h-4.5 shrink-0" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar — 5 items */}
      <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950 border-t border-slate-800 flex">
        {bottomTabs.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors relative",
              isActive(item.href)
                ? "text-emerald-400"
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            <span className="relative">
              <item.icon className="w-5 h-5" />
              {badgeMap[item.href] != null && (badgeMap[item.href] ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1.5 bg-emerald-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  {(badgeMap[item.href] ?? 0) > 9 ? "9+" : badgeMap[item.href]}
                </span>
              )}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
        <button
          onClick={() => setOpen(true)}
          className="flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
