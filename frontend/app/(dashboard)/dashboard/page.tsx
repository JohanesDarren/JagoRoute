"use client";

import { useEffect, useState } from "react";
import {
  Cpu,
  Waypoints,
  KeyRound,
  Activity,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import StatCard from "@/components/StatCard";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api";
import type { DashboardStats } from "@/lib/types";
import { fmtDate, timeAgo } from "@/lib/utils";

const TOOLTIP_STYLE = {
  backgroundColor: "#201d30",
  border: "1px solid #434653",
  borderRadius: "8px",
  color: "#e5dffa",
  fontSize: "12px",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<DashboardStats>("/dashboard/stats").then(setStats).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Your IoT routing workspace at a glance" />

      {error && (
        <div className="mb-4 rounded-lg border border-error-container/40 bg-error-container/20 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Hardware" value={stats?.total_hardware ?? "—"} icon={Cpu} accent="emerald" />
        <StatCard label="Routes" value={stats?.total_routes ?? "—"} icon={Waypoints} accent="indigo" />
        <StatCard label="Active API Keys" value={stats?.active_keys ?? "—"} icon={KeyRound} accent="amber" />
        <StatCard label="Requests (24h)" value={stats?.total_requests_24h ?? "—"} icon={Activity} accent="sky" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Success rate chart */}
        <div className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-on-surface">Recent success rate</h3>
            <button
              className="text-on-surface-variant transition-colors hover:text-primary"
              onClick={() => api<DashboardStats>("/dashboard/stats").then(setStats)}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          {stats && stats.recent_logs.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buildChartData(stats.recent_logs)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#434653" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8d909f" }} axisLine={{ stroke: "#434653" }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8d909f" }} width={28} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(99,140,255,0.06)" }} />
                  <Bar dataKey="ok" stackId="a" fill="#b4c5ff" />
                  <Bar dataKey="error" stackId="a" fill="#ffb4ab" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-on-surface-variant">
              No gateway traffic yet. Create a route and copy an API key into your .env.
            </p>
          )}
        </div>

        {/* Recent requests */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card">
          <div className="border-b border-outline-variant bg-surface p-5">
            <h3 className="text-xl font-semibold text-on-surface">Recent requests</h3>
          </div>
          {stats && stats.recent_logs.length > 0 ? (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low">
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-outline">Route</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-outline">Method</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-outline">Status</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-outline">When</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_logs.slice(0, 6).map((log) => (
                    <tr key={log.id} className="border-b border-outline-variant transition-colors last:border-0 hover:bg-surface-container-low">
                      <td className="max-w-[140px] truncate px-4 py-3 font-mono text-[13px] text-on-surface-variant">
                        {log.route_path ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-surface-container px-2 py-1 text-xs font-semibold text-on-surface">
                          {log.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[13px]">
                        <span className={log.success ? "text-primary" : "text-error"}>
                          {log.success ? "200 OK" : `ERR (${log.status_code})`}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-on-surface-variant">
                        {timeAgo(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-16 text-center text-sm text-on-surface-variant">
              No requests yet.{" "}
              <Link href="/routes" className="font-semibold text-primary hover:underline">
                Build a route
              </Link>{" "}
              to get started.
            </p>
          )}
        </div>
      </div>

      <p className="mt-5 text-right text-xs text-on-surface-variant">
        Last traffic: {stats?.recent_logs[0] ? fmtDate(stats.recent_logs[0].created_at) : "—"}
      </p>
    </div>
  );
}

function buildChartData(logs: DashboardStats["recent_logs"]) {
  const buckets = logs.slice(0, 10).reverse().map((l) => ({
    name: l.route_path?.slice(0, 10) ?? "?",
    ok: l.success ? 1 : 0,
    error: l.success ? 0 : 1,
  }));
  return buckets;
}
