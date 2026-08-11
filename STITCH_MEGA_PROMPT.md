# JagoRoute — Full Product Design Brief (Mega Prompt for Google Stitch)

> **How to use this brief in Stitch:**
> 1. Paste this whole document as your project brief / starting prompt (or the "Design system" section first).
> 2. Generate in this order: **Design system → App shell → Login/Register → Dashboard → Hardware → Routes → API Keys → Request Logs**.
> 3. Keep ONE design system for every screen — do not introduce new colors, radii, or type styles per screen. Every screen must reuse the tokens and components below.
> 4. All screens are for the light theme unless stated otherwise.

---

## 1. Product overview

**JagoRoute is an IoT API Router** — a control plane that connects physical hardware (weather stations, ESP32 sensors, gateways) to consumer applications, WITHOUT ever handing device credentials to the consumer.

The 3-step mental model:

1. **Hardware** — register a device: its base URL/IP + its own credentials (query params like `application_key`, `api_key`, `mac`, or auth headers).
2. **Routes** — group one or more devices into a **single unified endpoint** (`/gateway/v1/<route>`). JagoRoute proxies, aggregates, and logs the traffic.
3. **API Keys** — generate `.env`-ready keys (`jago_live_…`) so a software team can call the route. The consumer app only ever sees **URL + key** — never the device's credentials.

**Brand personality:** smart, trustworthy, engineering-grade but friendly. "Jago" (Indonesian: *expert*). Tone: calm, confident, precise.

**Who uses it:** IoT integrators / hardware owners building the dashboard in JagoRoute. Their customers build consumer apps that consume the unified route.

---

## 2. Design system — the single source of truth

### 2.1 Color

**Brand (primary) — Emerald.** *This is the identity; never change it.*
| Token | Value |
|---|---|
| Primary | emerald-600 `#059669` (buttons, active nav, logo chip, focus rings) |
| Primary hover | emerald-700 `#047857` |
| Primary subtle bg | emerald-50 `#ecfdf5` (chips, badges, active nav) |
| Primary text-on-light | emerald-700 |

**Neutrals — Slate scale (50–900):** page background `slate-50`; surfaces `white`; borders `slate-200`; primary text `slate-900`; secondary text `slate-500/600`; muted `slate-400`.

**Semantic:**
| Meaning | Pair (bg / text) |
|---|---|
| Success | emerald-50 / emerald-600 |
| Danger | rose-50 / rose-600 (solid buttons: rose-600 → hover rose-700) |
| Warning | amber-50 / amber-700 |
| Info | sky-50 / sky-600 |
| Modal scrim | slate-900/40 |

**Entity accent system — the core visual language.** Every resource type has ONE accent, used consistently for its icon chips, stat cards, and highlights:
- **Hardware → emerald** (icon: Cpu)
- **Routes → indigo** (icon: Waypoints)
- **API Keys → amber** (icon: KeyRound)
- **Logs/traffic → sky** (icon: FileClock / Activity)
- Destructive actions → rose (icon: Trash2 / Ban)

### 2.2 Typography

- **UI font:** Inter (fallback: system sans stack).
- **Mono font:** JetBrains Mono / ui-monospace — used for ALL URLs, route paths, API keys, `.env` snippets, credentials, and code blocks.
- Scale: caption 11px → xs 12px → **sm 14px (primary body size)** → md 16px → lg 18px → page title 2xl bold → stat value 3xl bold.

### 2.3 Shape, spacing, elevation

- Radius: `rounded-lg` (8px) controls · `rounded-xl` (12px) cards · `rounded-full` badges/pills.
- Spacing: 4px base scale (`space-y-4` forms, `p-5` cards, `p-8` page content).
- Elevation: cards = `border slate-200` + `shadow-sm`; modals = `shadow-xl` over scrim; hover on clickable cards = subtle lift.

### 2.4 Motion

- Transitions 150–200ms `ease-out` on hover/focus.
- Modal: fade + slight scale in 200ms; scrim fades.
- Copy feedback: swap icon to check for 1.5s.
- Loading: skeleton shimmer blocks (NOT plain "Loading…" text).

### 2.5 Component inventory (build once, reuse on every screen)

1. **Button** — variants: `primary` (emerald-600, white text, icon gap-2), `secondary` (white, slate-300 border, hover slate-50), `danger` (rose-600), `icon-only` (table row actions, 32px, hover tinted bg — red-50 for destructive). Sizes: md (default) and sm (text-xs, px-3). States: default / hover / disabled (opacity-50, no pointer) / loading (spinner).
2. **Input / Select / Textarea** — slate-300 border, rounded-lg, text-sm, `focus: emerald-500 border + ring-2 emerald-100`. Label above (sm, slate-600), optional helper text below (xs, slate-400), error state = rose border + rose message. Password inputs get a show/hide toggle.
3. **Badge / Pill** — rounded-full, xs, font-medium, optional 3px dot or icon. Variants: neutral (slate-100/600), success (emerald-50/600), warning (amber-50/700), danger (rose-50/600), info (sky-50/600).
4. **Card** — white, rounded-xl, border slate-200, shadow-sm, p-5.
5. **Icon chip** — 36px rounded-lg tinted square (entity accent bg-50 + icon accent-600).
6. **StatCard** — label sm slate-500, icon chip top-right, 3xl bold value, optional xs hint.
7. **PageHeader** — h1 2xl bold + subtitle sm slate-500 (left), primary action button (right).
8. **Modal** — scrim slate-900/40, centered white panel (max-w-md; `wide` = max-w-2xl), p-6 rounded-xl, title lg bold + X close button, body = form space-y-4, footer = right-aligned Cancel (secondary) + Submit (primary, spinner while saving).
9. **Table** — thead xs uppercase slate-400, border-b slate-200; rows border-slate-100, text-sm; status column = badge; actions right-aligned; consistent column headers.
10. **Empty state** — centered muted text (sm slate-400), optional inline CTA link (emerald-600, hover underline).
11. **Error alert** — rose-50 bg, rose-700 text, rounded-lg, px-3 py-2, shown above content.
12. **Code block** — dark: slate-900 bg + emerald-300 mono text (`.env` snippets); light: slate-50 bg + slate-600 mono text (URLs/paths).
13. **Toast / inline copy feedback** — check icon swap on copy buttons.
14. **Sidebar nav item** — active: emerald-50 bg + emerald-700 text + icon; inactive: slate-600, hover slate-50. Icons 16px, gap-3.

---

## 3. App shell (dashboard layout)

- **Fixed left sidebar, w-60:** logo block (emerald-600 rounded-lg chip with Route icon + "JagoRoute" bold + "IoT API Router" 11px muted) → nav list (Dashboard, Hardware, Routes, API Keys, Request Logs) → bottom user block (name/email truncate + full-width secondary "Sign out" button with LogOut icon).
- **Main area:** `ml-60`, p-8, page bg slate-50.
- **Auth gate:** while checking tokens, show centered muted "Loading JagoRoute…".
- **Responsive:** below lg, sidebar collapses to an icon rail (or slide-over with hamburger); content padding drops to p-4.

---

## 4. Pages

### 4.1 Login (`/login`)
Centered auth card (max-w-md) on a soft gradient (`emerald-50 → slate-50 → slate-100`). Brand block (logo chip + name + tagline). Form: **Email**, **Password** (with show/hide). Error alert on failed auth. Full-width primary **"Sign in"** (LogIn icon, spinner while loading). Footer: "No account yet? **Register**" (emerald link). No sidebar — standalone layout.

### 4.2 Register (`/register`)
Same auth shell. Fields: **Full name**, **Email**, **Password (min 8 chars)** with helper text. Title "Create account", tagline "Join the JagoRoute workspace". Full-width primary **"Create account"** (UserPlus). Footer link back to "Sign in".

### 4.3 Dashboard (`/dashboard`) — the workspace overview
PageHeader "Dashboard" + subtitle "Your IoT routing workspace at a glance".
- **Row of 4 StatCards** (2-col on mobile, 4-col on lg): Hardware (emerald/Cpu) · Routes (indigo/Waypoints) · Active API Keys (amber/KeyRound) · Requests (24h) (sky/Activity). Values render "—" until loaded.
- **Below, 3-col grid (1fr + 2fr):**
  - Card **"Recent success rate"** — stacked bar chart (emerald `ok` bars, rose `error` bars, ~10 most recent requests on X-axis) + refresh icon button top-right.
  - Card **"Recent requests"** — compact table: Route · Method · Status (badge: emerald "200" / rose "ERR (code)") · Latency (ms) · When (time-ago). Empty state: "No requests yet. **Build a route** to get started." (link).
- Footer caption (xs, muted): "Last traffic: …".

### 4.4 Hardware (`/hardware`) — register devices + credentials
PageHeader "Hardware" + subtitle "Register the raw IPs and URLs of your IoT devices" + primary **"Add hardware"**.
- **Card grid** (1/2/3 cols responsive). Each card: emerald Cpu icon chip + name (bold) + created time-ago (xs muted) + status pill (dot + active/inactive) · base_url in a light mono code block (truncate) · optional description · xs amber lines: "`N` custom header(s) configured" and "`N` credential(s) configured" · footer: **Edit** (secondary, flex-1) + trash icon button (rose on hover).
- **Modal "Add hardware" / "Edit hardware"** (max-w-md):
  1. Name (placeholder "ESP32 Sensor A")
  2. Base URL / IP (placeholder "http://192.168.1.50:8080")
  3. Description
  4. **Auth headers (JSON, optional)** — mono textarea, placeholder `{"Authorization":"Basic dXNlcjpwYXNz"}`; invalid JSON shows inline rose error.
  5. **Query params / credentials** — the signature feature. Repeatable key/value rows (mono inputs), trash per row, secondary **"Add credential"** button. Helper text: "Sent with every request to this device. Example for Ecowitt: `application_key`, `api_key`, `mac`" + reassurance "the consumer app will never need them." Empty state note when no rows.
  6. **Status** select (Active / Inactive).
  7. Footer: Cancel / Save ("Saving…" spinner; label changes to "Save changes" when editing).
- **Delete:** confirm dialog warning "This will break any route mapping to it."

### 4.5 Routes (`/routes`) — group devices into one URL
PageHeader "Routes" + subtitle "Group multiple hardware APIs into a single unified endpoint" + primary **"New route"**.
- **Route cards** (stacked): indigo Waypoints chip + bold `/{route_path}` + meta xs muted "N device(s) · time ago" · actions: **Copy URL** (secondary sm — copies full gateway URL, swaps to emerald check for 1.5s) + trash. Full gateway URL in a light mono code block. Mapping list below: rows = method badge (slate) + hardware name → mono `target_path`.
- **Modal "New route" (wide):**
  - Route path (placeholder "all-sensors") + Description (2-col on sm).
  - **Mapped hardware** — repeatable rows: [device select] [target_path input w-32] [method select GET/POST/PUT/PATCH/DELETE] [remove X]. Secondary **"Add device"**. Empty note: "No devices mapped. Add your hardware to this route."
  - Footer: Cancel / "Create route" (spinner "Creating…").

### 4.6 API Keys (`/keys`) — issue .env-ready keys
PageHeader "API Keys" + subtitle "Generate .env-ready keys for your software team" + primary **"Generate key"**.
- **"Share this with your software team"** card (top): Terminal icon + title, then dark terminal-style code block `JAGO_ROUTE_API_KEY=…` + copy button (only enabled after a key exists).
- **One-time reveal alert** (emerald-50 border): "Key created — copy it now, it won't be shown again!" + full key (mono, break-all) + primary Copy button.
- **Table:** Name · Key (`prefix…` mono) · Last used (time-ago) · Created (date) · Status badge (active = emerald / revoked = neutral) · Actions: **Ban icon** (title "Revoke key", red hover) — hidden for revoked keys.
- **Revoke:** confirm warning "Software using it will lose access immediately."
- **Modal "Generate API key":** Key name (placeholder "Production Server Key") + helper + amber warning note (KeyRound icon) "The full key is shown exactly once after creation." Footer: Cancel / Generate (spinner "Generating…").

### 4.7 Request Logs (`/logs`) — traffic audit
PageHeader "Request Logs" + subtitle "Traffic passing through your gateway routes".
- **Table:** When (xs, nowrap) · Route · API Key (name) · Method (neutral badge) · Status (emerald "200" / rose error code badge) · Latency (ms) · Detail (truncated, max-w 260px).
- Footer note (xs, muted, FileClock icon): "Only the last 50 requests are shown."
- Loading skeleton rows; empty state "No gateway traffic recorded yet."

---

## 5. Data model (use for realistic mock data)

- **User:** id, email, full_name, is_active, created_at
- **Hardware:** id, name, base_url, description?, auth_headers `{k:v}`, query_params `{k:v}`, status `active|inactive`, created_at
- **Mapping:** id, hardware `{id,name,base_url}`, target_path, method
- **Route:** id, route_path, description?, mappings[], created_at
- **ApiKey:** id, name, key_prefix (`jago_live_…`), last_used_at?, revoked_at?, created_at (+ full `key` shown exactly once at creation)
- **RequestLog:** id, method, request_path, status_code, response_time_ms, success, error_detail?, created_at, route_path?, api_key_name?
- **DashboardStats:** total_hardware, active_hardware, total_routes, active_keys, total_mapped, total_requests_24h, recent_logs[]

---

## 6. UX rules (apply everywhere)

1. Every page: loading skeletons → content → empty state → error alert (rose-50) above content on failure.
2. Destructive actions ALWAYS confirm, stating the consequence (breaks mappings / revokes access immediately).
3. Copy actions ALWAYS give visual feedback (check icon, 1.5s).
4. Secrets & identifiers use mono + masking (`prefix…`); full keys shown exactly once.
5. All interactive elements have hover states; icon-only buttons get tinted hover backgrounds (rose-50 for destructive).
6. Accessibility: visible emerald focus rings, AA contrast, aria-labels on icon buttons, ESC/overlay-click closes modals, keyboard-navigable forms.
7. Consistent empty/error copy tone across all pages ("No X yet. …" pattern with a next-step CTA).

---

## 7. Tech constraints

- Next.js 14 App Router, **client components**, Tailwind CSS, `lucide-react` icons, `recharts` for charts.
- Generate components that map 1:1 to the existing page structure so code slots directly into the current app.
- Keep the utility class conventions: `.card`, `.btn-primary`, `.btn-secondary`, `.input`, `.label`, `.badge`.

---

## 8. Suggested generation order in Stitch

1. **Design system** page (tokens, type, component inventory above)
2. **App shell** with sidebar
3. **Login** + **Register**
4. **Dashboard**
5. **Hardware** (+ add/edit modal with credential editor)
6. **Routes** (+ new-route modal)
7. **API Keys** (+ one-time reveal)
8. **Request Logs**
