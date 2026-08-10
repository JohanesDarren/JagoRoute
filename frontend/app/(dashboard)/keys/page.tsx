"use client";

import { useEffect, useState } from "react";
import { KeyRound, Plus, Copy, Ban, Check, Terminal } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import type { ApiKeyCreated, ApiKeyInfo } from "@/lib/types";
import { cn, timeAgo, fmtDate } from "@/lib/utils";

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

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="card mb-6">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Terminal className="h-4 w-4" /> Share this with your software team
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-xs text-emerald-300">
            {created
              ? `JAGO_ROUTE_API_KEY=${created.key}`
              : "JAGO_ROUTE_API_KEY=jago_live_…  (generate a key first)"}
          </code>
          {created && (
            <button
              onClick={() => copy(`JAGO_ROUTE_API_KEY=${created.key}`, "env")}
              className="btn-secondary text-xs"
            >
              {copied === "env" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {created && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-800">
            Key created — copy it now, it won&apos;t be shown again!
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg bg-white px-3 py-2 text-xs text-slate-700">
              {created.key}
            </code>
            <button onClick={() => copy(created.key, "key")} className="btn-primary text-xs">
              {copied === "key" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy
            </button>
          </div>
        </div>
      )}

      {keys.length === 0 ? (
        <div className="card text-center text-sm text-slate-400">
          No API keys yet. Generate one to let your software team call your routes.
        </div>
      ) : (
        <div className="card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="py-2">Name</th>
                <th>Key</th>
                <th>Last used</th>
                <th>Created</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-slate-100">
                  <td className="py-2 font-medium text-slate-700">{k.name}</td>
                  <td className="font-mono text-xs text-slate-500">{k.key_prefix}…</td>
                  <td className="text-xs text-slate-400">{timeAgo(k.last_used_at)}</td>
                  <td className="text-xs text-slate-400">{fmtDate(k.created_at)}</td>
                  <td>
                    <span
                      className={cn(
                        "badge",
                        k.revoked_at ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-600"
                      )}
                    >
                      {k.revoked_at ? "revoked" : "active"}
                    </span>
                  </td>
                  <td className="text-right">
                    {!k.revoked_at && (
                      <button
                        onClick={() => revoke(k)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Revoke key"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
            <p className="mt-1 text-xs text-slate-400">
              Pick a name your software team will recognise in their .env.
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
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