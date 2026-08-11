"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Cpu,
  Waypoints,
  KeyRound,
  FileClock,
  LogOut,
  Bell,
  Settings2,
  CircleHelp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, clearTokens, getTokens } from "@/lib/api";
import type { User } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hardware", label: "Hardware", icon: Cpu },
  { href: "/routes", label: "Routes", icon: Waypoints },
  { href: "/keys", label: "API Keys", icon: KeyRound },
  { href: "/logs", label: "Request Logs", icon: FileClock },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!getTokens()) {
      router.replace("/login");
      return;
    }
    api<User>("/auth/me")
      .then((u) => {
        setUser(u);
        setReady(true);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  function logout() {
    clearTokens();
    router.replace("/login");
  }

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-on-surface-variant">
        Loading JagoRoute…
      </div>
    );
  }

  const initials = (user.full_name || user.email)
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col border-r border-outline-variant bg-surface-container-lowest md:flex">
        <div className="flex h-full flex-col justify-between py-8">
          <div>
            {/* Brand */}
            <div className="mb-8 flex items-center gap-3 px-6">
              <img src="/logo.png" alt="JagoRoute Logo" className="h-8 w-8 object-contain" />
              <div>
                <div className="text-lg font-black leading-none text-primary">JagoRoute</div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                  IoT API Router
                </div>
              </div>
            </div>

            {/* Primary nav */}
            <nav className="flex flex-col gap-1">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 border-l-4 px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] transition-all duration-150",
                      active
                        ? "scale-[0.99] border-primary bg-primary-container text-on-primary-container"
                        : "border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer nav */}
          <div className="flex flex-col gap-1">
            <div
              className="flex items-center gap-3 border-l-4 border-transparent px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant/60"
              title="Coming soon"
            >
              <Settings2 className="h-[18px] w-[18px]" />
              Settings
            </div>
            <div
              className="flex items-center gap-3 border-l-4 border-transparent px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant/60"
              title="Coming soon"
            >
              <CircleHelp className="h-[18px] w-[18px]" />
              Support
            </div>
            <div className="mt-3 px-6">
              <button
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <main className="flex min-h-screen w-full flex-col md:ml-[240px]">
        {/* Top app bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant bg-surface px-5 md:px-8">
          <div className="flex items-center gap-2.5 md:hidden">
            <img src="/logo.png" alt="JagoRoute Logo" className="h-8 w-8 object-contain" />
            <span className="text-lg font-black text-primary">JagoRoute</span>
          </div>
          <div className="ml-auto flex items-center gap-4 text-on-surface-variant">
            <button
              className="rounded-full p-2 transition-colors hover:bg-surface-container hover:text-primary"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>
            <button
              className="rounded-full p-2 transition-colors hover:bg-surface-container hover:text-primary"
              title="Settings"
              aria-label="Settings"
            >
              <Settings2 className="h-5 w-5" />
            </button>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high text-xs font-bold text-primary"
              title={user.email}
            >
              {initials}
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1200px] flex-1 p-5 pb-24 md:p-8 md:pb-8">{children}</div>
      </main>

      {/* Mobile bottom navigation (design: mobile fallback nav) */}
      <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-outline-variant bg-surface px-2 py-2 md:hidden">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-label={label}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-wide transition-colors",
                active
                  ? "bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant hover:text-primary"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
