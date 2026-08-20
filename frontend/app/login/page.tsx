"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { api, setTokens, ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      <div className="w-full max-w-[420px] overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-modal">
        <div className="h-1 w-full bg-primary" />

        <div className="p-8">
          {/* Logo + Title */}
          <div className="mb-6 flex flex-col items-center gap-2">
            <img src="/logo-sm.png" alt="JagoRoute" className="h-12 w-12" />
            <span className="text-lg font-bold tracking-tight text-primary">JagoRoute</span>
          </div>

          {/* Password Form */}
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="label" htmlFor="password">Password</label>
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
                  title={showPassword ? "Hide" : "Show"}
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

            <button type="submit" disabled={loading} className="btn-primary mt-1 w-full py-3 text-base font-bold">
              <LogIn className="h-5 w-5" />
              {loading ? "Opening..." : "Open JagoRoute"}
            </button>
          </form>

          <p className="mt-3 text-center text-xs text-on-surface-variant">
            Default password: <code className="font-mono text-primary">123456</code>
          </p>
        </div>
      </div>
    </div>
  );
}
