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
  Route as RouteIcon,
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
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        Loading JagoRoute…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <RouteIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">JagoRoute</div>
            <div className="text-[11px] text-slate-400">IoT API Router</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="mb-2 truncate text-sm font-semibold text-slate-800">
            {user.full_name || user.email}
          </div>
          <button onClick={logout} className="btn-secondary w-full justify-center">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="ml-60 flex-1 p-8">{children}</main>
    </div>
  );
}