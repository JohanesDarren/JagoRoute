"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Cpu } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import type { Hardware } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

interface HardwareFormState {
  name: string;
  base_url: string;
  description: string;
  auth_headers: string;
  query_params: { key: string; value: string }[];
  status: "active" | "inactive";
}

const EMPTY: HardwareFormState = {
  name: "",
  base_url: "",
  description: "",
  auth_headers: "",
  query_params: [],
  status: "active",
};

export default function HardwarePage() {
  const [items, setItems] = useState<Hardware[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Hardware | null>(null);
  const [form, setForm] = useState<HardwareFormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setItems(await api<Hardware[]>("/hardware"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load hardware.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(h: Hardware) {
    setEditing(h);
    setForm({
      name: h.name,
      base_url: h.base_url,
      description: h.description ?? "",
      auth_headers: Object.keys(h.auth_headers).length ? JSON.stringify(h.auth_headers, null, 2) : "",
      query_params: Object.entries(h.query_params).map(([key, value]) => ({ key, value })),
      status: h.status,
    });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    let authHeaders: Record<string, string> | undefined;
    if (form.auth_headers.trim()) {
      try {
        authHeaders = JSON.parse(form.auth_headers);
      } catch {
        setError('auth_headers must be valid JSON (e.g. {"X-Key":"abc"}).');
        setSaving(false);
        return;
      }
    }
    const queryParams = form.query_params
      .filter((r) => r.key.trim())
      .reduce<Record<string, string>>((acc, r) => {
        acc[r.key.trim()] = r.value;
        return acc;
      }, {});
    const payload = {
      name: form.name,
      base_url: form.base_url,
      description: form.description || null,
      auth_headers: authHeaders,
      query_params: queryParams,
      status: form.status,
    };
    try {
      if (editing) {
        await api(`/hardware/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api("/hardware", { method: "POST", body: JSON.stringify(payload) });
      }
      setOpen(false);
      await load();
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  function addParam() {
    setForm({ ...form, query_params: [...form.query_params, { key: "", value: "" }] });
  }
  function updateParam(i: number, field: "key" | "value", val: string) {
    setForm({
      ...form,
      query_params: form.query_params.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)),
    });
  }
  function removeParam(i: number) {
    setForm({ ...form, query_params: form.query_params.filter((_, idx) => idx !== i) });
  }

  async function remove(h: Hardware) {
    if (!confirm(`Delete "${h.name}"? This will break any route mapping to it.`)) return;
    await api(`/hardware/${h.id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Hardware"
        subtitle="Register the raw IPs and URLs of your IoT devices"
        action={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" /> Add hardware
          </button>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-error-container/40 bg-error-container/20 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
              <div className="mb-3 h-9 w-9 rounded skeleton" />
              <div className="mb-3 h-5 w-2/3 skeleton rounded" />
              <div className="mb-3 h-6 w-1/2 skeleton rounded" />
              <div className="h-4 w-full skeleton rounded" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card py-12 text-center text-sm text-on-surface-variant">
          No hardware yet. Add your first device API to start routing.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((h) => (
            <div
              key={h.id}
              className="flex flex-col rounded-lg border border-outline-variant bg-surface-container-lowest p-4 transition-colors duration-150 hover:bg-surface-container-low"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded bg-primary-container/10 text-primary">
                  <Cpu className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  {timeAgo(h.created_at)}
                </span>
              </div>

              <h3 className="mb-2 text-lg font-bold text-on-surface">{h.name}</h3>

              <code className="mb-3 inline-block w-max max-w-full truncate rounded border border-outline-variant/50 bg-surface-container px-2 py-1 font-mono text-[13px] text-on-surface-variant">
                {h.base_url}
              </code>

              <div className="mb-3 flex items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    h.status === "active" ? "bg-primary" : "bg-outline-variant"
                  )}
                />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant capitalize">
                  {h.status}
                </span>
              </div>

              {h.description && <p className="mb-3 text-sm text-on-surface-variant">{h.description}</p>}

              <div className="mb-3 flex gap-4 border-t border-outline-variant/30 pt-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-on-surface">
                    {Object.keys(h.auth_headers).length}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">
                    Custom Headers
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-on-surface">
                    {Object.keys(h.query_params).length}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">
                    Credentials
                  </span>
                </div>
              </div>

              <div className="mt-auto flex justify-end gap-2 border-t border-outline-variant/50 pt-3">
                <button
                  onClick={() => openEdit(h)}
                  className="rounded px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant transition-colors hover:text-primary"
                >
                  <Pencil className="mr-1 inline h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => remove(h)}
                  className="rounded p-1 text-error transition-colors hover:bg-error-container"
                  title="Delete hardware"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit hardware" : "Add hardware"}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="ESP32 Sensor A"
            />
          </div>
          <div>
            <label className="label">Base URL / IP</label>
            <input
              className="input font-mono"
              required
              value={form.base_url}
              onChange={(e) => setForm({ ...form, base_url: e.target.value })}
              placeholder="http://192.168.1.50:8080"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <input
              className="input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Temp & humidity sensor"
            />
          </div>
          <div>
            <label className="label">Auth headers (JSON, optional)</label>
            <textarea
              className="input font-mono"
              rows={3}
              value={form.auth_headers}
              onChange={(e) => setForm({ ...form, auth_headers: e.target.value })}
              placeholder='{"Authorization":"Basic dXNlcjpwYXNz"}'
            />
          </div>
          <div>
            <label className="label">Query params / credentials</label>
            <p className="mb-2 -mt-1 text-xs text-on-surface-variant">
              Sent with every request to this device. Example for Ecowitt:{" "}
              <code className="font-mono text-primary">application_key</code>,{" "}
              <code className="font-mono text-primary">api_key</code>,{" "}
              <code className="font-mono text-primary">mac</code>
            </p>
            <div className="space-y-2">
              {form.query_params.length === 0 && (
                <p className="text-xs text-on-surface-variant">
                  No credentials yet — the consumer app will never need them.
                </p>
              )}
              {form.query_params.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input font-mono flex-1"
                    placeholder="key"
                    value={row.key}
                    onChange={(e) => updateParam(i, "key", e.target.value)}
                  />
                  <input
                    className="input font-mono flex-1"
                    placeholder="value"
                    value={row.value}
                    onChange={(e) => updateParam(i, "value", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeParam(i)}
                    className="btn-secondary px-3 text-error"
                    title="Remove credential"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addParam} className="btn-secondary mt-2">
              <Plus className="h-4 w-4" /> Add credential
            </button>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as HardwareFormState["status"] })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : editing ? "Save changes" : "Add hardware"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
