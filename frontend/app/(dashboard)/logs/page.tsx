"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Timer,
  KeyRound,
  Download,
  Pause,
  Play,
  Plus,
  Eye,
  BarChart3,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { api, ApiError } from "@/lib/api";
import type { ApiKeyInfo, Hardware, LogStats, RequestLog } from "@/lib/types";
import { cn, timeAgo, fmtDate } from "@/lib/utils";

const RANGES = [
  { k: "24h", label: "24H", hours: 24 },
  { k: "7d", label: "7D", hours: 168 },
  { k: "30d", label: "30D", hours: 720 },
] as const;

const GREEN = "#34d399";
const AMBER = "#fbbf24";
const SKY = "#38bdf8";
const PRIMARY = "#638cff";

function MetricCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <div className="relative flex h-28 flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-card transition-colors duration-150 hover:border-primary">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
        {label}
      </div>
      <div className="text-3xl font-bold tracking-tight" style={{ color }}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-on-surface-variant">{sub}</div>}
      <div className="absolute right-4 top-4">
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
    </div>
  );
}

/** Build a smooth cubic bezier curve between two points with a nice S-shape */
function flexEdge(from: [number, number], to: [number, number]): string {
  const dx = to[0] - from[0];
  const cpOffset = Math.abs(dx) * 0.55;
  return `M ${from[0]} ${from[1]} C ${from[0] + cpOffset} ${from[1]}, ${to[0] - cpOffset} ${to[1]}, ${to[0]} ${to[1]}`;
}

type FlowView = "overview" | "detail";

function TrafficGraph({
  hardware,
  keys,
  active,
  pulse,
  stats,
  view,
}: {
  hardware: Hardware[];
  keys: ApiKeyInfo[];
  active: boolean;
  pulse: number;
  stats: LogStats | null;
  view: FlowView;
}) {
  const hw = hardware.slice(0, 5);
  const consumers = keys.filter((k) => !k.revoked_at).slice(0, 4);
  const router: [number, number] = [260, 150];

  const hwPts = hw.map((_, i) => [18, 34 + i * 54] as [number, number]);
  const conPts = consumers.map((_, i) => [392, 56 + i * 60] as [number, number]);

  const isDetail = view === "detail";

  return (
    <svg viewBox="0 0 520 300" className="h-full w-full" role="img" aria-label="Traffic flow graph">
      {/* hardware -> router edges */}
      {hwPts.map((p, i) => {
        const from: [number, number] = [p[0] + 120, p[1] + 19];
        const to: [number, number] = [router[0] - 66, router[1]];
        const d = flexEdge(from, to);
        return (
          <g key={`hw-edge-${i}`}>
            <path d={d} fill="none" stroke="#434653" strokeWidth={1.5} />
            {active && <path d={d} fill="none" stroke={PRIMARY} strokeWidth={1.8} className="edge-flow" />}
            {isDetail && (
              <text
                x={(from[0] + to[0]) / 2}
                y={(from[1] + to[1]) / 2 - 6}
                textAnchor="middle"
                fill={PRIMARY}
                fontSize={8}
                fontWeight={700}
                opacity={0.85}
              >
                {stats ? `${Math.round(stats.avg_latency_ms)}ms` : "—"}
              </text>
            )}
          </g>
        );
      })}

      {/* router -> consumer edges */}
      {conPts.map((p, i) => {
        const from: [number, number] = [router[0] + 66, router[1]];
        const to: [number, number] = [p[0] - 8, p[1] + 19];
        const d = flexEdge(from, to);
        return (
          <g key={`con-edge-${i}`}>
            <path d={d} fill="none" stroke="#434653" strokeWidth={1.5} />
            {active && <path d={d} fill="none" stroke="#ccbeff" strokeWidth={1.8} className="edge-flow" />}
            {isDetail && (
              <text
                x={(from[0] + to[0]) / 2}
                y={(from[1] + to[1]) / 2 - 6}
                textAnchor="middle"
                fill="#ccbeff"
                fontSize={8}
                fontWeight={700}
                opacity={0.85}
              >
                {stats ? `${stats.success_rate}%` : "—"}
              </text>
            )}
          </g>
        );
      })}

      {/* flow pulses (retriggered on each new log) */}
      {hwPts.map((p, i) => (
        <circle key={`p-hw-${i}-${pulse}`} r={3.5} fill={PRIMARY}>
          <animateMotion dur="1.4s" repeatCount="indefinite" path={flexEdge([p[0] + 120, p[1] + 19], [router[0] - 66, router[1]])} />
        </circle>
      ))}
      {conPts.map((p, i) => (
        <circle key={`p-con-${i}-${pulse}`} r={3.5} fill="#ccbeff">
          <animateMotion dur="1.6s" repeatCount="indefinite" path={flexEdge([router[0] + 66, router[1]], [p[0] - 8, p[1] + 19])} />
        </circle>
      ))}

      {/* hardware nodes */}
      {hw.map((h, i) => (
        <g key={h.id}>
          <rect x={hwPts[i][0]} y={hwPts[i][1]} width={120} height={38} rx={8} fill="#1c192c" stroke="#434653" />
          <circle cx={hwPts[i][0] + 18} cy={hwPts[i][1] + 19} r={4} fill={PRIMARY} />
          <text x={hwPts[i][0] + 30} y={hwPts[i][1] + 16} fill="#c3c6d6" fontSize={10.5} fontWeight={600}>
            {h.name.slice(0, 14)}
          </text>
          <text x={hwPts[i][0] + 30} y={hwPts[i][1] + 29} fill="#8d909f" fontSize={9}>
            {h.base_url.replace(/^https?:\/\//, "").slice(0, 18)}
          </text>
        </g>
      ))}
      {hw.length === 0 && (
        <text x={20} y={160} fill="#8d909f" fontSize={11}>
          Add hardware to visualize the flow
        </text>
      )}

      {/* consumer nodes */}
      {conPts.map((p, i) => (
        <g key={consumers[i].id}>
          <rect x={p[0]} y={p[1]} width={110} height={38} rx={8} fill="#1c192c" stroke="#434653" />
          <circle cx={p[0] + 16} cy={p[1] + 19} r={4} fill="#ccbeff" />
          <text x={p[0] + 28} y={p[1] + 16} fill="#c3c6d6" fontSize={10.5} fontWeight={600}>
            {consumers[i].name.slice(0, 13)}
          </text>
          <text x={p[0] + 28} y={p[1] + 29} fill="#8d909f" fontSize={9}>
            consumer app
          </text>
        </g>
      ))}
      {consumers.length === 0 && (
        <text x={390} y={160} fill="#8d909f" fontSize={11}>
          No consumer apps yet
        </text>
      )}

      {/* router node */}
      <g>
        <rect x={194} y={128} width={132} height={44} rx={10} fill="#201d30" stroke={PRIMARY} strokeWidth={1.5} />
        <text x={260} y={148} textAnchor="middle" fill="#e5dffa" fontSize={12.5} fontWeight={800}>
          JagoRoute
        </text>
        <text x={260} y={163} textAnchor="middle" fill="#8d909f" fontSize={8.5} letterSpacing={1.5}>
          ROUTER
        </text>
      </g>

      {/* Detail: stats badge on router node */}
      {isDetail && stats && (
        <g>
          <rect x={210} y={177} width={100} height={20} rx={6} fill="rgba(99,140,255,0.15)" stroke={PRIMARY} strokeWidth={0.5} />
          <text x={260} y={190} textAnchor="middle" fill={PRIMARY} fontSize={8.5} fontWeight={700}>
            {stats.total_requests} req · {stats.success_rate}%
          </text>
        </g>
      )}
    </svg>
  );
}

export default function LogsPage() {
  const [stats, setStats] = useState<LogStats | null>(null);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [hardware, setHardware] = useState<Hardware[]>([]);
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [range, setRange] = useState<(typeof RANGES)[number]["k"]>("24h");
  const [pulse, setPulse] = useState(0);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flowView, setFlowView] = useState<FlowView>("overview");
  const idSet = useRef(new Set<string>());
  const logsRef = useRef<RequestLog[]>([]);
  const statsFallbackRef = useRef(false);

  // Client-side fallback so the page always works even when the analytics
  // endpoint is unavailable (older backend, proxy/CDN blocking, etc.).
  function deriveStats(from: RequestLog[]): LogStats {
    const total = from.length;
    const ok = from.filter((l) => l.success).length;
    const avgLatency =
      total > 0 ? from.reduce((s, l) => s + l.response_time_ms, 0) / total : 0;
    const perRoute = new Map<string, { count: number; ok: number; latency: number }>();
    for (const l of from) {
      const key = l.route_path ?? l.request_path ?? "(direct)";
      const cur = perRoute.get(key) ?? { count: 0, ok: 0, latency: 0 };
      cur.count += 1;
      if (l.success) cur.ok += 1;
      cur.latency += l.response_time_ms;
      perRoute.set(key, cur);
    }
    return {
      range_hours: RANGES.find((r) => r.k === range)?.hours ?? 24,
      total_requests: total,
      success_count: ok,
      error_count: total - ok,
      success_rate: total > 0 ? Math.round((ok / total) * 1000) / 10 : 0,
      avg_latency_ms: avgLatency,
      per_route: Array.from(perRoute, ([route_path, v]) => ({
          route_path,
          count: v.count,
          ok: v.ok,
          error: v.count - v.ok,
          avg_latency_ms: v.count > 0 ? v.latency / v.count : 0,
        })).sort((a, b) => b.count - a.count),
    };
  }

  async function loadStats() {
    try {
      setStats(await api<LogStats>(`/logs/stats?range=${range}`));
      // Recovered — leave fallback mode and clear the notice.
      statsFallbackRef.current = false;
      setError(null);
    } catch (e) {
      // Analytics endpoint unavailable — degrade to feed-derived stats and
      // show a subtle notice instead of a blocking error banner.
      statsFallbackRef.current = true;
      setStats(deriveStats(logsRef.current));
      setError(e instanceof ApiError ? e.message : "Failed to load analytics.");
    }
  }

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => {
    api<Hardware[]>("/hardware")
      .then(setHardware)
      .catch(() => {});
    api<ApiKeyInfo[]>("/keys")
      .then(setKeys)
      .catch(() => {});
  }, []);

  // Live feed — running logs
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    async function tick() {
      try {
        const fresh = await api<RequestLog[]>("/logs?limit=40");
        if (cancelled) return;
        const newOnes = fresh.filter((l) => !idSet.current.has(l.id));
        newOnes.forEach((l) => idSet.current.add(l.id));
        if (newOnes.length) {
          const merged = [...newOnes, ...logsRef.current].slice(0, 60);
          logsRef.current = merged;
          setLogs(merged);
          // Keep client-side stats fresh when the analytics API is down.
          if (statsFallbackRef.current) setStats(deriveStats(merged));
          setLastAdded(newOnes[0].id);
          setPulse((p) => p + 1);
        }
      } catch {
        /* transient poll errors are ignored */
      }
    }
    tick();
    const t = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [live]);

  function exportCsv() {
    if (logs.length === 0) return;
    const header = ["When", "Route", "API Key", "Method", "Status", "Latency (ms)", "Detail"];
    const sanitize = (v: unknown) => String(v).replace(/[\r\n]+/g, " ").replaceAll('"', '""');
    const rows = logs.map((l) =>
      [
        fmtDate(l.created_at),
        l.route_path ?? "",
        l.api_key_name ?? "",
        l.method,
        l.success ? "200" : String(l.status_code),
        String(l.response_time_ms),
        l.error_detail ?? "",
      ]
        .map((v) => `"${sanitize(v)}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jagoroute-request-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const activeKeys = keys.filter((k) => !k.revoked_at).length;

  return (
    <div>
      <PageHeader
        title="Usage & Analytics"
        subtitle="Monitor your API usage, traffic, and request logs"
        action={
          <button onClick={exportCsv} disabled={logs.length === 0} className="btn-secondary">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-outline-variant/60 bg-surface-container px-3 py-2 text-sm text-on-surface-variant">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
          <span>
            Analytics endpoint unavailable — showing live metrics from the recent feed.{" "}
            <span className="font-mono text-[12px] text-outline">{error}</span>
          </span>
        </div>
      )}

      {/* Range filter + live toggle */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center rounded-lg border border-outline-variant bg-surface-container p-1">
          {RANGES.map((r) => (
            <button
              key={r.k}
              onClick={() => setRange(r.k)}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors",
                range === r.k
                  ? "bg-surface-container-highest text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setLive((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors",
            live ? "text-primary hover:bg-surface-container" : "text-on-surface-variant hover:text-on-surface"
          )}
        >
          {live ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {live ? "Pause feed" : "Resume feed"}
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-5">
        <MetricCard
          label="Total Requests"
          value={stats ? String(stats.total_requests) : "—"}
          sub={`in ${RANGES.find((r) => r.k === range)?.label} window`}
          color="#e5dffa"
          icon={Activity}
        />
        <MetricCard
          label="Success Rate"
          value={stats ? `${stats.success_rate}%` : "—"}
          sub={`${stats?.success_count ?? 0} ok`}
          color={GREEN}
          icon={CheckCircle2}
        />
        <MetricCard
          label="Errors"
          value={stats ? String(stats.error_count) : "—"}
          sub="failed requests"
          color="#ffb4ab"
          icon={AlertTriangle}
        />
        <MetricCard
          label="Avg Latency"
          value={stats ? `${Math.round(stats.avg_latency_ms)}ms` : "—"}
          sub="response time"
          color={AMBER}
          icon={Timer}
        />
        <MetricCard
          label="Active Keys"
          value={String(activeKeys)}
          sub="consumer apps"
          color={SKY}
          icon={KeyRound}
        />
      </div>

      {/* Split view: graph + live feed */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-5 2xl:grid-cols-5">
        {/* Node graph */}
        <div className="relative flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card lg:col-span-3">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface/50 px-5 py-3">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                Data Flow
              </h3>
              <p className="mt-0.5 text-xs text-outline">hardware → router → consumer apps</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-outline-variant bg-surface-container p-0.5">
                <button
                  onClick={() => setFlowView("overview")}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                    flowView === "overview"
                      ? "bg-surface-container-highest text-on-surface shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  <Eye className="h-3 w-3" />
                  Overview
                </button>
                <button
                  onClick={() => setFlowView("detail")}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                    flowView === "detail"
                      ? "bg-surface-container-highest text-on-surface shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  <BarChart3 className="h-3 w-3" />
                  Detail
                </button>
              </div>
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-widest",
                  (stats?.total_requests ?? 0) > 0
                    ? "border-primary-container/40 bg-primary-container/10 text-primary"
                    : "border-outline-variant/50 bg-surface-container text-on-surface-variant"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    (stats?.total_requests ?? 0) > 0 ? "animate-pulse bg-primary" : "bg-outline-variant"
                  )}
                />
                {stats ? (stats.total_requests > 0 ? "Traffic" : "Idle") : "—"}
              </span>
            </div>
          </div>
          <div className="h-[320px] p-2">
            <TrafficGraph hardware={hardware} keys={keys} active={(stats?.total_requests ?? 0) > 0} pulse={pulse} stats={stats} view={flowView} />
          </div>
          <Link
            href="/hardware"
            className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-secondary transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" /> Add hardware
          </Link>
        </div>

        {/* Live feed */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface px-4 py-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
              Recent Requests
            </h3>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Live
            </span>
          </div>

          <div className="max-h-[320px] flex-1 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="px-4 py-16 text-center text-sm text-on-surface-variant">
                No gateway traffic yet — wait for a consumer app to call a route and it will stream
                here.
              </p>
            ) : (
              logs.map((l) => (
                <div
                  key={l.id}
                  className={cn(
                    "flex items-center gap-3 border-b border-outline-variant/50 px-4 py-2.5 transition-colors last:border-0 hover:bg-surface-container-low",
                    l.id === lastAdded && "log-enter"
                  )}
                >
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", l.success ? "bg-primary" : "bg-error")} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-[13px] text-on-surface">
                      /{l.route_path ?? l.request_path}
                    </div>
                    <div className="truncate text-[11px] text-on-surface-variant">
                      {l.api_key_name ?? "no key"}
                    </div>
                  </div>
                  <span className="shrink-0 rounded bg-surface-container px-1.5 py-0.5 font-mono text-[11px] text-on-surface-variant">
                    {l.method}
                  </span>
                  <span className={cn("w-8 shrink-0 text-right font-mono text-[12px]", l.success ? "text-primary" : "text-error")}>
                    {l.success ? "200" : l.status_code}
                  </span>
                  <span className="w-14 shrink-0 text-right font-mono text-[11px] text-on-surface-variant">
                    {Math.round(l.response_time_ms)}ms
                  </span>
                  <span className="w-16 shrink-0 text-right text-[11px] text-on-surface-variant">
                    {timeAgo(l.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Per-route breakdown */}
      {stats && stats.per_route.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card">
          <div className="border-b border-outline-variant bg-surface px-5 py-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
              Traffic by route
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-surface-container-low">
                <tr className="border-b border-outline-variant">
                  <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">Route</th>
                  <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">Requests</th>
                  <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">Success</th>
                  <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">Errors</th>
                  <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">Avg Latency</th>
                </tr>
              </thead>
              <tbody>
                {stats.per_route.map((r, i) => (
                  <tr key={`${r.route_path}-${i}`} className="border-b border-outline-variant/50 transition-colors last:border-0 hover:bg-surface-container-low">
                    <td className="px-5 py-3 font-mono text-[13px] text-on-surface">/{r.route_path}</td>
                    <td className="px-5 py-3 font-medium text-on-surface">{r.count}</td>
                    <td className="px-5 py-3 font-mono text-[13px] text-primary">{r.ok}</td>
                    <td className={cn("px-5 py-3 font-mono text-[13px]", r.error > 0 ? "text-error" : "text-on-surface-variant")}>
                      {r.error}
                    </td>
                    <td className="px-5 py-3 font-mono text-[13px] text-on-surface-variant">
                      {Math.round(r.avg_latency_ms)}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
