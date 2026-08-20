"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Waypoints, Copy, X, Check, ArrowRight, ExternalLink, GitBranch } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import type { Hardware, Route } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace("/api/v1", "") + "/gateway/v1/";

interface Row {
  hardware_id: string;
  target_path: string;
  method: string;
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [hardware, setHardware] = useState<Hardware[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Route | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [routePath, setRoutePath] = useState("");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    try {
      const [r, h] = await Promise.all([api<Route[]>("/routes"), api<Hardware[]>("/hardware")]);
      setRoutes(r);
      setHardware(h);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setRoutePath("");
    setDescription("");
    setRows([]);
    setError(null);
    setOpen(true);
  }

  function openEdit(route: Route) {
    setEditing(route);
    setRoutePath(route.route_path);
    setDescription(route.description ?? "");
    setRows(
      route.mappings.map((m) => ({
        hardware_id: m.hardware.id,
        target_path: m.target_path,
        method: m.method,
      }))
    );
    setError(null);
    setOpen(true);
  }

  function addRow() {
    setRows([...rows, { hardware_id: hardware[0]?.id ?? "", target_path: "", method: "GET" }]);
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const activeRows = rows.filter((r) => r.hardware_id);
    try {
      if (editing) {
        await api(`/routes/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ route_path: routePath, description: description || null }),
        });
        await api(`/routes/${editing.id}/mappings`, {
          method: "PUT",
          body: JSON.stringify(activeRows),
        });
      } else {
        await api("/routes", {
          method: "POST",
          body: JSON.stringify({
            route_path: routePath,
            description: description || null,
            mappings: activeRows,
          }),
        });
      }
      setEditing(null);
      setOpen(false);
      await load();
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Failed to save route.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(route: Route) {
    if (!confirm(`Delete route "/${route.route_path}"?`)) return;
    await api(`/routes/${route.id}`, { method: "DELETE" });
    await load();
  }

  async function copyUrl(path: string) {
    try {
      await navigator.clipboard.writeText(`${GATEWAY_URL}${path}`);
      setCopied(path);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard may be blocked */
    }
  }

  return (
    <div>
      <PageHeader
        title="Routes"
        subtitle="Group multiple hardware APIs into a single unified endpoint"
        action={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" /> New route
          </button>
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-lg border border-outline-variant bg-surface-container p-4">
        <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-on-surface">JagoRoute is an aggregator, not a proxy</h4>
          <p className="mt-1 text-sm text-on-surface-variant">
            Routes with <strong>2+ devices</strong> fan out to all hardware simultaneously and merge responses.
            Single-device routes act as a simple proxy — useful for hiding credentials from the consumer app.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-error-container/40 bg-error-container/20 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      {routes.length === 0 ? (
        <div className="card py-12 text-center text-sm text-on-surface-variant">
          No routes yet. Create one to expose a unified endpoint to your software team.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {routes.map((r) => (
            <article
              key={r.id}
              className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest"
            >
              {/* Card header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant bg-surface/50 p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                    <Waypoints className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-on-surface">/{r.route_path}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                        {r.mappings.length} device(s) · {timeAgo(r.created_at)}
                      </span>
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
                        r.mappings.length > 1
                          ? "bg-primary-container/20 text-primary border border-primary-container/30"
                          : "bg-tertiary-container/20 text-tertiary border border-tertiary-container/30"
                      )}>
                        {r.mappings.length > 1 ? <GitBranch className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
                        {r.mappings.length > 1 ? "Aggregator" : "Proxy"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(r)}
                    className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-secondary"
                    title="Edit route"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => copyUrl(r.route_path)}
                    className="flex items-center gap-1.5 rounded border border-outline-variant px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary transition-colors hover:bg-surface-container"
                    title="Copy unified URL"
                  >
                    {copied === r.route_path ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied === r.route_path ? "Copied" : "Copy URL"}
                  </button>
                  <button
                    onClick={() => remove(r)}
                    className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
                    title="Delete route"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Card body */}
              <div className="flex flex-col gap-4 p-6">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Gateway Endpoint
                  </span>
                  <div className="flex items-center justify-between gap-2 rounded border border-outline-variant/50 bg-surface-container px-4 py-3 font-mono text-[13px] text-on-surface">
                    <span className="truncate">
                      {GATEWAY_URL}
                      {r.route_path}
                    </span>
                    <ExternalLink className="h-4 w-4 shrink-0 cursor-pointer text-outline transition-colors hover:text-secondary" />
                  </div>
                </div>

                <div>
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Upstream Mappings
                  </span>
                  {r.mappings.length > 0 ? (
                    <div className="overflow-hidden rounded border border-outline-variant bg-surface-container-lowest">
                      {r.mappings.map((m, i) => (
                        <div
                          key={m.id}
                          className={`flex items-center gap-4 p-3 transition-colors hover:bg-surface ${
                            i < r.mappings.length - 1 ? "border-b border-outline-variant" : ""
                          }`}
                        >
                          <span className="rounded-sm bg-tertiary-container px-2 py-0.5 font-mono text-xs text-on-tertiary-container">
                            {m.method}
                          </span>
                          <span className="flex-1 truncate text-sm text-on-surface">{m.hardware.name}</span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-outline-variant" />
                          <span className="shrink-0 font-mono text-sm text-secondary" title="URL the gateway will call">
                            {m.target_path ? m.hardware.base_url + m.target_path : m.hardware.base_url}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center rounded border border-outline-variant bg-surface-container-lowest py-6">
                      <p className="text-sm text-outline">No upstream mappings configured yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit route" : "New route"} wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Route path</label>
              <input
                className="input font-mono"
                required
                value={routePath}
                onChange={(e) => setRoutePath(e.target.value)}
                placeholder="all-sensors"
              />
            </div>
            <div>
              <label className="label">Description</label>
              <input
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Aggregate all sensors"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="label mb-0">Mapped hardware</label>
              <button type="button" onClick={addRow} className="btn-secondary text-xs">
                <Plus className="h-3.5 w-3.5" /> Add device
              </button>
            </div>
            <p className="mb-2 text-[11px] text-on-surface-variant">
              Leave the target path <em>blank</em> when the hardware base URL already contains the full endpoint —
              the gateway calls it exactly as stored.
            </p>

            {rows.length === 0 && (
              <p className="rounded-lg bg-surface-container px-3 py-2 text-xs text-on-surface-variant">
                No devices mapped. Add your hardware to this route.
              </p>
            )}

            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    className="input flex-1"
                    value={row.hardware_id}
                    onChange={(e) => updateRow(i, { hardware_id: e.target.value })}
                  >
                    <option value="">Select device…</option>
                    {hardware.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input w-40 font-mono"
                    value={row.target_path}
                    onChange={(e) => updateRow(i, { target_path: e.target.value })}
                    placeholder="/temp (blank = base_url)"
                    title="Optional path appended to the base URL — leave blank to call the base URL exactly as stored"
                  />
                  <select
                    className="input w-28"
                    value={row.method}
                    onChange={(e) => updateRow(i, { method: e.target.value })}
                  >
                    {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                    className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                    title="Remove mapping"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : editing ? "Save changes" : "Create route"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
