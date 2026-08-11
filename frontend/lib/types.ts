// ---- Shared API types (mirror backend schemas) -------------------------

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Hardware {
  id: string;
  name: string;
  base_url: string;
  description: string | null;
  auth_headers: Record<string, string>;
  query_params: Record<string, string>;
  status: "active" | "inactive";
  created_at: string;
}

export interface Mapping {
  id: string;
  hardware: { id: string; name: string; base_url: string };
  target_path: string;
  method: string;
}

export interface Route {
  id: string;
  route_path: string;
  description: string | null;
  mappings: Mapping[];
  created_at: string;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface ApiKeyCreated extends ApiKeyInfo {
  key: string;
}

export interface RequestLog {
  id: string;
  method: string;
  request_path: string;
  status_code: number;
  response_time_ms: number;
  success: boolean;
  error_detail: string | null;
  created_at: string;
  route_path: string | null;
  api_key_name: string | null;
}

export interface RouteStat {
  route_path: string;
  count: number;
  ok: number;
  error: number;
  avg_latency_ms: number;
}

export interface LogStats {
  range_hours: number;
  total_requests: number;
  success_count: number;
  error_count: number;
  success_rate: number;
  avg_latency_ms: number;
  per_route: RouteStat[];
}

export interface DashboardStats {
  total_hardware: number;
  active_hardware: number;
  total_routes: number;
  active_keys: number;
  total_mapped: number;
  total_requests_24h: number;
  recent_logs: RequestLog[];
}