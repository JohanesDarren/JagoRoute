"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Cpu, CircleDot } from "lucide-react";
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
  status: "active" | "inactive";
}

const EMPTY: HardwareFormState = {
  name: "",
  base_url: "",
  description: "",
  auth_headers: "",
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
    const payload = {
      name: form.name,
      base_url: form.base_url,
      description: form.description || null,
      auth_headers: authHeaders,
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

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <div className="card text-center text-sm text-slate-400">
          No hardware yet. Add your first device API to start routing.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((h) => (
            <div key={h.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{h.name}</p>
                    <p className="text-xs text-slate-400">{timeAgo(h.created_at)}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    "badge",
                    h.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                  )}
                >
                  <CircleDot className="h-3 w-3" /> {h.status}
                </span>
              </div>

              <code className="mt-4 block truncate rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {h.base_url}
              </code>
              {h.description && <p className="mt-3 text-sm text-slate-500">{h.description}</p>}
              {Object.keys(h.auth_headers).length > 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  {Object.keys(h.auth_headers).length} custom header(s) configured
                </p>
              )}

              <div className="mt-4 flex gap-2">
                <button onClick={() => openEdit(h)} className="btn-secondary flex-1 justify-center">
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button onClick={() => remove(h)} className="btn-secondary justify-center text-red-600">
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
              className="input"
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