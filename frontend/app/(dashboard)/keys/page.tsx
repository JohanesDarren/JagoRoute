"use client";

import { useEffect, useState } from "react";
import { KeyRound, Plus, Copy, Check, Info, Terminal } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import type { ApiKeyCreated, ApiKeyInfo } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState<"key" | "env" | null>(null);

  async function load() {
    try {
      setKeys(await api<ApiKeyInfo[]>("/keys"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load keys.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const k = await api<ApiKeyCreated>("/keys", { method: "POST", body: JSON.stringify({ name }) });
      setCreated(k);
      setOpen(false);
      setName("");
      await load();
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Failed to create key.");
    } finally {
      setSaving(false);
    }
  }

  async function revoke(k: ApiKeyInfo) {
    if (!confirm(`Revoke key "${k.name}"? Software using it will lose access immediately.`)) return;
    await api(`/keys/${k.id}`, { method: "DELETE" });
    await load();
  }

  async function copy(text: string, what: "key" | "env") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard may be blocked */
    }
  }

  return (
    <div>
      <PageHeader
        title="API Keys"
        subtitle="Generate .env-ready keys for your software team"
        action={
          <button onClick={() => setOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Generate key
          </button>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-error-container/40 bg-error-container/20 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      {/* Quick Start terminal block */}
      <div className="mb-6 flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-high shadow-card md:flex-row">
        <div className="flex flex-col justify-center border-b border-outline-variant p-4 md:w-1/3 md:border-b-0 md:border-r">
          <div className="mb-1 flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            <h3 className="text-lg font-semibold text-on-surface">Quick Start</h3>
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            Share this with your software team to authenticate immediately.
          </p>
        </div>
        <div className="group relative bg-surface-container-lowest p-4 md:w-2/3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-xs text-on-surface-variant opacity-70">.env</span>
            {created && (
              <button
                onClick={() => copy(`JAGO_ROUTE_API_KEY=${created.key}`, "env")}
                className="flex items-center gap-1 text-on-surface-variant opacity-100 transition-colors hover:text-primary md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
              >
                {copied === "env" ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="text-xs font-semibold uppercase tracking-wide">{copied === "env" ? "Copied" : "Copy"}</span>
              </button>
            )}
          </div>
          <div className="overflow-x-auto whitespace-nowrap pb-1 font-mono text-sm text-primary">
            {created
              ? `JAGO_ROUTE_API_KEY=${created.key}`
              : "JAGO_ROUTE_API_KEY=jago_live_…  (generate a key first)"}
          </div>
        </div>
      </div>

      {/* One-time reveal */}
      {created && (
        <div className="mb-6 rounded-lg border border-primary-container/30 bg-primary-container/10 p-4">
          <p className="text-sm font-semibold text-primary">
            Key created — copy it now, it won&apos;t be shown again!
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded border border-outline-variant/50 bg-surface-container px-3 py-2 font-mono text-xs text-on-surface">
              {created.key}
            </code>
            <button onClick={() => copy(created.key, "key")} className="btn-primary text-xs">
              {copied === "key" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy
            </button>
          </div>
        </div>
      )}

      {/* Keys table */}
      {keys.length === 0 ? (
        <div className="card py-12 text-center text-sm text-on-surface-variant">
          No API keys yet. Generate one to let your software team call your routes.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-surface-container-low">
                <tr className="border-b border-outline-variant">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Name</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Key Prefix</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Last Used</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Status</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr
                    key={k.id}
                    className={cn(
                      "border-b border-outline-variant transition-colors last:border-0 hover:bg-surface-container-low",
                      k.revoked_at && "opacity-60"
                    )}
                  >
                    <td className={cn("px-4 py-4 font-medium text-on-surface", k.revoked_at && "line-through")}>
                      {k.name}
                    </td>
                    <td className={cn("px-4 py-4 font-mono text-[13px] text-on-surface-variant", k.revoked_at && "line-through")}>
                      {k.key_prefix}…
                    </td>
                    <td className="px-4 py-4 text-on-surface-variant">{timeAgo(k.last_used_at)}</td>
                    <td className="px-4 py-4">
                      {k.revoked_at ? (
                        <span className="inline-flex items-center gap-1 rounded border border-error-container/30 bg-error-container/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-error">
                          Revoked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded border border-primary-container/30 bg-primary-container/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
                          <span className="h-2 w-2 rounded-full bg-primary" /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {!k.revoked_at && (
                        <button
                          onClick={() => revoke(k)}
                          className="inline-flex w-full items-center justify-end gap-1 text-on-surface-variant transition-colors hover:text-error"
                          title="Revoke key"
                        >
                          <span className="text-xs font-semibold uppercase tracking-[0.08em]">Revoke</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security notice */}
      <div className="mt-6 flex items-start gap-3 rounded-lg border border-tertiary-container/30 bg-tertiary-container/10 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-tertiary" />
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface">
            Security Notice
          </h4>
          <p className="mt-1 text-sm text-on-surface-variant">
            For security reasons, full API keys are only visible once upon creation. If you lose a
            key, you must revoke it and generate a new one.
          </p>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Generate API key">
        <form onSubmit={createKey} className="space-y-4">
          <div>
            <label className="label">Key name</label>
            <input
              className="input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Production Server Key"
            />
            <p className="mt-1 text-xs text-on-surface-variant">
              Pick a name your software team will recognise in their .env.
            </p>
          </div>
          <div className="rounded-lg border border-tertiary-container/30 bg-tertiary-container/10 px-3 py-2 text-xs text-tertiary">
            <KeyRound className="mr-1 inline h-3.5 w-3.5" />
            The full key is shown exactly once after creation.
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Generating…" : "Generate"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
