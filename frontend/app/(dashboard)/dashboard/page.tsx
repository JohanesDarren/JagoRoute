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
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Hardware" value={stats?.total_hardware ?? "—"} icon={Cpu} accent="emerald" />
        <StatCard label="Routes" value={stats?.total_routes ?? "—"} icon={Waypoints} accent="indigo" />
        <StatCard label="Active API Keys" value={stats?.active_keys ?? "—"} icon={KeyRound} accent="amber" />
        <StatCard label="Requests (24h)" value={stats?.total_requests_24h ?? "—"} icon={Activity} accent="sky" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Recent success rate</h3>
            <RefreshCw
              className="h-4 w-4 cursor-pointer text-slate-400 hover:text-slate-600"
              onClick={() => api<DashboardStats>("/dashboard/stats").then(setStats)}
            />
          </div>
          {stats && stats.recent_logs.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={buildChartData(stats.recent_logs)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                <Tooltip />
                <Bar dataKey="ok" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="error" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-sm text-slate-400">
              No gateway traffic yet. Create a route and copy an API key into your .env.
            </p>
          )}
        </div>

        <div className="card lg:col-span-2">
          <h3 className="mb-4 font-semibold text-slate-800">Recent requests</h3>
          {stats && stats.recent_logs.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                  <th className="py-2">Route</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Latency</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_logs.slice(0, 6).map((log) => (
                  <tr key={log.id} className="border-b border-slate-100">
                    <td className="py-2 font-medium text-slate-700">{log.route_path ?? "—"}</td>
                    <td className="text-slate-500">{log.method}</td>
                    <td>
                      <span
                        className={
                          log.success
                            ? "badge bg-emerald-50 text-emerald-600"
                            : "badge bg-rose-50 text-rose-600"
                        }
                      >
                        {log.success ? "200" : `ERR (${log.status_code})`}
                      </span>
                    </td>
                    <td className="text-slate-500">{log.response_time_ms}ms</td>
                    <td className="text-slate-400">{timeAgo(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-10 text-center text-sm text-slate-400">
              No requests yet.{" "}
              <Link href="/routes" className="font-semibold text-emerald-600 hover:underline">
                Build a route
              </Link>{" "}
              to get started.
            </p>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-400">
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