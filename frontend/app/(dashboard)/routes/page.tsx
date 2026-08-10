"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Waypoints, Copy, X, Check } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import type { Hardware, Route } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

const GATEWAY_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace("/api/v1", "") +
  "/gateway/v1/";

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
    setRoutePath("");
    setDescription("");
    setRows([]);
    setError(null);
    setOpen(true);
  }

  function addRow() {
    setRows([...rows, { hardware_id: hardware[0]?.id ?? "", target_path: "/data", method: "GET" }]);
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const activeRows = rows.filter((r) => r.hardware_id && r.target_path);
    try {
      await api("/routes", {
        method: "POST",
        body: JSON.stringify({
          route_path: routePath,
          description: description || null,
          mappings: activeRows,
        }),
      });
      setOpen(false);
      await load();
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Failed to create route.");
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

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {routes.length === 0 ? (
        <div className="card text-center text-sm text-slate-400">
          No routes yet. Create one to expose a unified endpoint to your software team.
        </div>
      ) : (
        <div className="space-y-4">
          {routes.map((r) => (
            <div key={r.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                    <Waypoints className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">/{r.route_path}</p>
                    <p className="text-xs text-slate-400">
                      {r.mappings.length} device(s) · {timeAgo(r.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyUrl(r.route_path)}
                    className="btn-secondary text-xs"
                    title="Copy unified URL"
                  >
                    {copied === r.route_path ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Copy URL
                  </button>
                  <button onClick={() => remove(r)} className="btn-secondary text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                <code className="text-xs break-all text-slate-600">
                  {GATEWAY_URL}
                  {r.route_path}
                </code>
              </div>

              {r.mappings.length > 0 && (
                <div className="mt-3 space-y-1">
                  {r.mappings.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="badge bg-slate-100 text-slate-600">{m.method}</span>
                      <span className="font-medium text-slate-700">{m.hardware.name}</span>
                      <span className="text-slate-400">→</span>
                      <code className="text-slate-500">{m.target_path}</code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New route" wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Route path</label>
              <input
                className="input"
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

            {rows.length === 0 && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
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
                    className="input w-32"
                    value={row.target_path}
                    onChange={(e) => updateRow(i, { target_path: e.target.value })}
                    placeholder="/temp"
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
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
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
              {saving ? "Creating…" : "Create route"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}