"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Route as RouteIcon, Lock, Eye, EyeOff, LogIn, ShieldCheck, Download, Copy, Check, Terminal } from "lucide-react";
import { api, setTokens, ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const INSTALL_CMD = "git clone https://github.com/JohanesDarren/JagoRoute.git && cd JagoRoute && docker compose up -d";

  async function copyInstall() {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // guard against double-submit (seen as duplicate 401s)
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
          <div className="mb-8 flex items-center justify-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-container text-on-primary-container">
              <RouteIcon className="h-[20px] w-[20px]" fill="currentColor" />
            </div>
            <span className="text-xl font-bold text-primary">JagoRoute</span>
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
              {loading ? "Opening…" : "Open JagoRoute"}
            </button>
          </form>

          {/* Self-host / get your own */}
          <div className="mt-6 rounded-lg border border-outline-variant bg-surface-container p-4">
            <div className="flex items-center gap-2 mb-3">
              <Download className="h-4 w-4 text-primary" />
              <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-on-surface">Get your own JagoRoute</h3>
            </div>
            <p className="text-xs text-on-surface-variant mb-3">
              Run this on your own machine — one command. Your hardware, your routes, your keys.
            </p>
            <div className="relative rounded border border-outline-variant/50 bg-surface-container-lowest p-3">
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="h-3.5 w-3.5 text-outline" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-outline">Terminal</span>
              </div>
              <code className="block text-xs text-on-surface break-all font-mono pr-14">
                {INSTALL_CMD}
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
              <span className="text-primary font-semibold">Prerequisites:</span> Docker · Git
              {" "}· Open{" "}
              <code className="text-primary font-mono">http://localhost:3000</code>{" "}
              after install. Default password:{" "}
              <code className="text-primary font-mono">123456</code>
            </p>
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
