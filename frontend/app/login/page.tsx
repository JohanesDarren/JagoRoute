"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, LogIn, ShieldCheck, Download, Copy, Check, Terminal, ChevronDown } from "lucide-react";
import { api, setTokens, ApiError } from "@/lib/api";

const TABS = [
  { key: "mac", label: "macOS / Linux" },
  { key: "win", label: "Windows" },
  { key: "docker", label: "Docker" },
] as const;

const INSTALL_CMD: Record<(typeof TABS)[number]["key"], string> = {
  mac: "npx -y jagoroute",
  win: "npx -y jagoroute",
  docker: "git clone https://github.com/JohanesDarren/JagoRoute.git && cd JagoRoute && docker compose up -d --build",
};

const NO_NODE_CMD: Record<Exclude<(typeof TABS)[number]["key"], "docker">, string> = {
  mac: "curl -s https://raw.githubusercontent.com/JohanesDarren/JagoRoute/main/frontend/public/install.sh | bash",
  win: "irm https://raw.githubusercontent.com/JohanesDarren/JagoRoute/main/frontend/public/install.ps1 | iex",
};

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"mac" | "win" | "docker">("mac");
  const [showInstall, setShowInstall] = useState(false);

  async function copyInstall() {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD[tab]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const tokens = await api<{ access_token: string; refresh_token: string; user: any }>(
        "/auth/local-login",
        { method: "POST", body: JSON.stringify({ password }) },
        false
      );
      setTokens(tokens);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-surface-container-highest p-4">
      <div className="w-full max-w-[440px] 2xl:max-w-[480px] overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-modal">
        <div className="h-1 w-full bg-primary" />

        <div className="p-8">
          {/* Brand block */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="rounded-2xl bg-surface-container-lowest p-2 ring-1 ring-outline-variant/70 shadow-modal">
              <img
                src="/logo-sm.png"
                alt="JagoRoute logo"
                width={256}
                height={256}
                className="h-16 w-16 object-contain"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-primary">JagoRoute</span>
          </div>

          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-1 text-3xl font-bold tracking-tight text-on-surface">Welcome</h1>
            <p className="text-sm text-on-surface-variant">Enter the password to open your router</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 h-4 w-4 text-outline" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoFocus
                  autoComplete="current-password"
                  className="input pl-10 pr-10"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 text-outline transition-colors hover:text-on-surface"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-error-container/40 bg-error-container/20 px-3 py-2 text-sm text-error">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary mt-2 w-full py-3 text-base font-bold">
              <LogIn className="h-5 w-5" />
              {loading ? "Opening..." : "Open JagoRoute"}
            </button>
          </form>

          {/* Self-host / get your own */}
          <div className="mt-6">
            <button
              onClick={() => setShowInstall((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-outline-variant bg-surface-container px-4 py-3 text-left transition-colors hover:bg-surface-container-high"
            >
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-on-surface">Get your own JagoRoute</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-outline transition-transform ${showInstall ? "rotate-180" : ""}`} />
            </button>

            {showInstall && (
              <div className="mt-3 rounded-lg border border-outline-variant bg-surface-container p-4">
                <p className="text-xs text-on-surface-variant mb-3">
                  Run this on your own machine — one command. Your hardware, your routes, your keys.
                </p>

                {/* Tabs */}
                <div className="flex items-center rounded-lg bg-surface-container-lowest border border-outline-variant/50 p-0.5 mb-3">
                  {TABS.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => { setTab(t.key); setCopied(false); }}
                      className={`flex-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors ${
                        tab === t.key
                          ? "bg-surface-container-highest text-on-surface shadow-sm"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Command block */}
                <div className="relative rounded border border-outline-variant/50 bg-surface-container-lowest p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Terminal className="h-3.5 w-3.5 text-outline" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-outline">Terminal</span>
                  </div>
                  <code className="block text-xs text-on-surface break-all font-mono pr-14">
                    {INSTALL_CMD[tab]}
                  </code>
                  <button
                    onClick={copyInstall}
                    className="absolute right-2 top-2 rounded p-1.5 text-on-surface-variant transition-colors hover:text-primary"
                    title="Copy install command"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <p className="mt-3 text-[10px] text-on-surface-variant">
                  <span className="text-primary font-semibold">Prerequisites:</span>{" "}
                  Node.js · Docker · Git
                  {" · "}Open{" "}
                  <code className="text-primary font-mono">http://localhost:3000</code>{" "}
                  after install. Default password:{" "}
                  <code className="text-primary font-mono">123456</code>
                </p>

                {tab !== "docker" && (
                  <p className="mt-2 text-[10px] text-on-surface-variant">
                    No Node.js? Use{" "}
                    <code className="break-all font-mono text-primary">{NO_NODE_CMD[tab]}</code>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-outline-variant pt-5 text-center">
            <ShieldCheck className="h-3.5 w-3.5 text-on-surface-variant" />
            <p className="text-xs text-on-surface-variant">
              Local install · default password{" "}
              <code className="font-mono text-primary">123456</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}