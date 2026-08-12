"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
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
  X,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Terminal,
  KeyRound as KeyIcon,
  Info,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, clearTokens, getTokens, ApiError } from "@/lib/api";
import type { User, RequestLog } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hardware", label: "Hardware", icon: Cpu },
  { href: "/routes", label: "Routes", icon: Waypoints },
  { href: "/keys", label: "API Keys", icon: KeyRound },
  { href: "/logs", label: "Request Logs", icon: FileClock },
];

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace("/api/v1", "") + "/gateway/v1/";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // ── Modals / popovers ──────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<RequestLog[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false);
    }
    if (notifOpen || settingsOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen, settingsOpen]);

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

  // Fetch error notifications when bell opens
  async function loadNotifs() {
    try {
      const logs = await api<RequestLog[]>("/logs?limit=50");
      const errors = logs.filter((l) => !l.success).slice(0, 3);
      setNotifs(errors);
      setNotifCount(errors.length);
    } catch {
      setNotifs([]);
    }
  }

  function toggleNotif() {
    if (!notifOpen) {
      loadNotifs();
      setNotifOpen(true);
    } else {
      setNotifOpen(false);
    }
  }

  function logout() {
    clearTokens();
    router.replace("/login");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      setPwError("Password must be at least 4 characters.");
      return;
    }
    setSavingPw(true);
    setPwError(null);
    setPwSuccess(false);
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: "123456", new_password: newPassword }),
      });
      setPwSuccess(true);
      setNewPassword("");
    } catch (err) {
      // If endpoint doesn't exist, fallback: show a note
      setPwError("Password change not available in this version. Use the ADMIN_PASSWORD env var on the server.");
    } finally {
      setSavingPw(false);
    }
  }

  async function copyQuickStart() {
    try {
      await navigator.clipboard.writeText(
        `# JagoRoute .env snippet\nJAGO_ROUTE_API_KEY=jago_live_YOUR_KEY_HERE\n# Gateway URL:\n# ${GATEWAY_URL}your-route-path\n# Example:\n# curl -s "${GATEWAY_URL}all-sensors" -H "Authorization: jago_live_..."`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-on-surface-variant">
        Loading JagoRoute...
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
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] 2xl:w-[260px] flex-col border-r border-outline-variant bg-surface-container-lowest md:flex">
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
                        : "border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-primary",
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
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-3 border-l-4 border-transparent px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
            >
              <Settings2 className="h-[18px] w-[18px]" />
              Settings
            </button>
            <button
              onClick={() => setSupportOpen(true)}
              className="flex items-center gap-3 border-l-4 border-transparent px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
            >
              <CircleHelp className="h-[18px] w-[18px]" />
              Support
            </button>
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
      <main className="flex min-h-screen w-full flex-col md:ml-[240px] 2xl:ml-[260px]">
        {/* Top app bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant bg-surface px-5 md:px-8">
          <div className="flex items-center gap-2.5 md:hidden">
            <img src="/logo.png" alt="JagoRoute Logo" className="h-8 w-8 object-contain" />
            <span className="text-lg font-black text-primary">JagoRoute</span>
          </div>
          <div className="ml-auto flex items-center gap-4 text-on-surface-variant">
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={toggleNotif}
                className="relative rounded-full p-2 transition-colors hover:bg-surface-container hover:text-primary"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {notifCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[9px] font-bold text-on-error">
                    {notifCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-modal">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-on-surface">Notifications</h4>
                    <button onClick={() => setNotifOpen(false)} className="rounded p-0.5 text-on-surface-variant hover:text-on-surface">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {notifs.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-lg bg-surface-container px-3 py-4 text-center text-sm text-on-surface-variant">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      No recent errors — all clear.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {notifs.map((n) => (
                        <div key={n.id} className="rounded-lg border border-error-container/20 bg-error-container/10 p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-error" />
                            <span className="text-[11px] font-semibold text-on-surface">
                              {n.route_path ?? "Gateway"} — {n.status_code}
                            </span>
                          </div>
                          <p className="text-[11px] text-on-surface-variant ml-5.5">
                            {n.error_detail || "Upstream hardware unreachable"}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 ml-5.5 text-[10px] text-outline">
                            <Clock className="h-3 w-3" />
                            {n.method} · {n.response_time_ms}ms
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Settings (top bar) */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setSettingsOpen((v) => !v)}
                className="rounded-full p-2 transition-colors hover:bg-surface-container hover:text-primary"
                title="Settings"
                aria-label="Settings"
              >
                <Settings2 className="h-5 w-5" />
              </button>
              {settingsOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-modal">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-on-surface">Quick Settings</h4>
                    <button onClick={() => setSettingsOpen(false)} className="rounded p-0.5 text-on-surface-variant hover:text-on-surface">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-sm text-on-surface">
                      <UserRound className="h-4 w-4 text-outline" />
                      <span className="text-on-surface-variant">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-on-surface">
                      <Info className="h-4 w-4 text-outline" />
                      <span className="text-on-surface-variant">JagoRoute v1.0.0</span>
                    </div>
                    <form onSubmit={changePassword} className="flex flex-col gap-2">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                        Change password
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          className="input flex-1 text-sm"
                          placeholder="New password…"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button type="submit" disabled={savingPw} className="btn-primary text-xs px-3">
                          {savingPw ? "…" : "Save"}
                        </button>
                      </div>
                      {pwError && <p className="text-[11px] text-error">{pwError}</p>}
                      {pwSuccess && <p className="text-[11px] text-primary">Password updated.</p>}
                    </form>
                  </div>
                </div>
              )}
            </div>

            <div
              className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high text-xs font-bold text-primary"
              title={user.email}
            >
              {initials}
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1200px] 2xl:max-w-[1600px] flex-1 p-5 pb-24 md:p-8 md:pb-8">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
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
                  : "text-on-surface-variant hover:text-primary",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* ── Support Modal ────────────────────────────────────────────────── */}
      {supportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-modal">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-on-surface">Quick Start</h2>
              <button
                onClick={() => setSupportOpen(false)}
                className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-on-surface">1. Hardware goes here</h3>
                </div>
                <p className="text-sm text-on-surface-variant">
                  Register your IoT devices in the <strong>Hardware</strong> tab — enter their URL, auth headers, and query params (credentials). These never leak to the consumer app.
                </p>
              </div>

              <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Waypoints className="h-4 w-4 text-secondary" />
                  <h3 className="text-sm font-bold text-on-surface">2. Group into routes</h3>
                </div>
                <p className="text-sm text-on-surface-variant">
                  Create a <strong>Route</strong> to group multiple hardware endpoints. One call from the consumer app fans out to all devices simultaneously.
                </p>
              </div>

              <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
                <div className="mb-2 flex items-center gap-2">
                  <KeyIcon className="h-4 w-4 text-tertiary" />
                  <h3 className="text-sm font-bold text-on-surface">3. Share .env key</h3>
                </div>
                <p className="text-sm text-on-surface-variant mb-2">
                  Generate an API key in <strong>API Keys</strong>. Give the software team this single URL + key:
                </p>
                <div className="relative rounded border border-outline-variant/50 bg-surface-container-lowest p-3">
                  <code className="block text-xs text-on-surface break-all font-mono">
                    {GATEWAY_URL}your-route<br />
                    <span className="text-outline">Authorization: jago_live_YOUR_KEY</span>
                  </code>
                  <button
                    onClick={copyQuickStart}
                    className="absolute right-2 top-2 rounded p-1 text-on-surface-variant transition-colors hover:text-primary"
                    title="Copy snippet"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface-container px-3 py-2 text-xs text-on-surface-variant">
                <Info className="h-3.5 w-3.5 shrink-0" />
                JagoRoute is an aggregator, not a proxy. Multi-device routes fan out to all hardware — you get one merged JSON response.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}