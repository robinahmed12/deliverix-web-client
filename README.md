# Deliverix Web

Web frontend for the **Deliverix Delivery Management System** — an operations console for managing orders, dispatching drivers, tracking deliveries, and administering the platform.

Built as a modern, server-rendered Next.js App Router application with a strictly typed, hand-written API layer against the Express/Prisma backend in the sibling `Deliverix` repository.

---

## Table of contents

- [Overview](#overview)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Features](#features)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [NPM scripts & quality gates](#npm-scripts--quality-gates)
- [API & data layer](#api--data-layer)
- [Authentication & authorization](#authentication--authorization)
- [Routes](#routes)
- [Conventions & constraints](#conventions--constraints)
- [Deployment](#deployment)
- [Known deviations & limitations](#known-deviations--limitations)
- [Roadmap](#roadmap)
- [Documentation](#documentation)

---

## Overview

Deliverix Web is the admin/operations front end of a delivery management platform. It talks to a REST backend (`/api/v1`) that owns the workflow state machine, authorization, audit trail, and business rules. The frontend is deliberately thin on business logic:

- The **backend is the authority for contracts** — routes, DTOs, error codes, and permissions.
- The **frontend SRS is the authority for behavior** — rendering, list/pagination/empty states, auth flows, and UI requirements.
- All authorization decisions are enforced server-side; the UI only *reflects* permissions (hiding actions a user shouldn't perform).

The application delivers the complete operational surface in eight phases (now complete): foundation & auth, orders, dispatch, drivers, vehicles, customers/zones/service types, tracking-proof, and reporting/notifications/audit/hardening.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | **Next.js 16.3.5** (App Router, Turbopack, React Server Components) |
| Runtime / UI | **React 19.2**, TypeScript **strict** |
| Server state | **TanStack Query v5** (queries, infinite queries, mutations, cache) |
| Forms & validation | **React Hook Form** + **Zod v4** (`@hookform/resolvers`) |
| Styling | **Tailwind CSS v4** + shadcn-style primitives (`base-nova` / `mist` preset) |
| Icons | `lucide-react` |
| Dates | `date-fns`, `date-fns-tz` |
| Tables | `@tanstack/react-table` |
| Notifications/toasts | `sonner` |
| Lint | ESLint 9 + `eslint-config-next` |

A full dependency list is in [`package.json`](./package.json).

---

## Architecture

High-level request flow:

```
Browser
  │  fetch("/api/v1/…")            httpOnly session cookies travel same-origin
  ▼
Next.js (App Router)
  ├─ Server Components ──► serverFetch() ──► BACKEND_URL/api/v1/…   (seeds initialData)
  ├─ Client Components ──► apiFetch()   ──► /api/v1/…  ──(rewrite)──► BACKEND_URL/api/v1/…
  └─ next.config.ts rewrite: /api/v1/:path* ──────────────────────► Express backend
  ▼
Express 5 + Prisma + PostgreSQL backend
```

Key architectural decisions:

- **Same-origin API proxy.** `next.config.ts` rewrites `/api/v1/*` to the backend so httpOnly auth cookies travel same-origin — no CORS `credentials` configuration is required. The rewrite can be replaced by a single-origin reverse proxy at deploy time.
- **Server-seeded, client-interactive pages.** Pages fetch reference data and the first page of results on the server (`serverFetch`) and pass it as `initialData` to TanStack Query hooks, eliminating loading flashes while keeping client-side filtering/pagination/infinite scroll.
- **Two clients, one contract.** `apiFetch` (browser) and `serverFetch` (RSC) share the same envelope-unwrapping and error-normalization semantics.
- **Presentation-only RBAC.** Navigation and action affordances are filtered by the authenticated user's effective permissions; the backend remains the authorization boundary.
- **Resilient sessions.** A 401 on a non-auth endpoint triggers a single deduplicated refresh/retry; a failed refresh emits a session-expired event and clears cached data.

---

## Features

### Foundation & authentication

- App shell with collapsible permission-filtered navigation, header with notification bell and user menu.
- Auth pages: **login (with MFA challenge step)**, **forgot password**, **reset password**, **accept invitation**.
- httpOnly-cookie session handling with automatic, deduplicated token refresh and forced sign-out on expiry.
- Route-group guards: `(app)` requires a session, `(auth)` redirects authenticated users away.

### Orders

- URL-state-driven order explorer: search, status filter, cursor pagination / load-more, server-seeded first page.
- Rich create-order form: customer/zone/service-type pickers, pickup & delivery addresses, line items, timing fields, fee override — with Zod validation.
- Order detail view with full status timeline (history), internal/customer notes, and a **Proof-of-Delivery** viewer.
- Status transitions via the backend workflow (no arbitrary status-set calls): mark-ready, cancel, notes.

### Dispatch

- Dispatch board with **Ready queue** and **In-progress** tabs, zone filter, driver workload cards with availability state filter.
- Assignment lifecycle actions: assign (offer), reassign (reason-code required), withdraw — with optional offer expiry.
- Assignment history table and at-a-glance workload.
- Respects the separation of order state and assignment state (assignments never force an order to `Assigned`).

### Drivers & vehicles

- Drivers: searchable, filterable list; create via user-account picker; detail view with current vehicle; activate/deactivate.
- Vehicles: registry with create/edit, capacity & type metadata, and driver allocation workflows.

### Customers, zones & service types

- Customers: directory with search, address management (default-address handling), and detail view.
- Zones: coverage areas, fee, currency, and priority; create/edit with an optional coverage-area rows editor.
- Service types: config-managed catalog used by order creation.

### Proof of delivery

- Read-only proof viewer on the order detail page: evidence type (recipient name / photo / signature / confirmation flag / OTP), status badges, corrected stamp, and signed-URL file links (only for accepted files).

### Reporting

- **Dashboard**: daily metrics, order status distribution, driver availability, driver & zone performance tables.
- **Reports explorer**: Deliveries / Drivers / Zones tabs with date-range and zone/status/driver filters, summary chips, and tables.
- Client-side range validation (≤ 90 days) mirrors the backend cap and produces clear feedback.

### Notifications, audit & settings

- **Notifications**: unread-only filter, mark-read / mark-all-read, deep links to related orders; header **bell shows a live unread count**.
- **Audit logs**: read-only searchable trail with datetime/action/resource filters, result badges, and expandable before/after JSON diffs.
- **Settings**: profile card, links to Security & MFA and System configuration, and "Sign out all devices".
- **Security**: TOTP MFA enrollment/confirmation.
- **System configuration** (`config.manage`): failure reasons, proof policies (with a versioned requirement matrix), and JSON system settings with sensitive-value redaction.

---

## Project structure

```
deliverix-web/
├─ src/
│  ├─ app/                          # App Router
│  │  ├─ (app)/                     # Authenticated shell (session-guarded)
│  │  │  ├─ dashboard/              #   Reports dashboard
│  │  │  ├─ orders/[orderId]/       #   Order list, new, detail (+ proof)
│  │  │  ├─ dispatch/               #   Dispatch board
│  │  │  ├─ drivers/[driverId]/     #   Drivers
│  │  │  ├─ vehicles/[vehicleId]/   #   Vehicles
│  │  │  ├─ customers/[customerId]/ #   Customers + addresses
│  │  │  ├─ zones/[zoneId]/         #   Zones
│  │  │  ├─ service-types/          #   Service types
│  │  │  ├─ reports/                #   Deliveries / drivers / zones reports
│  │  │  ├─ notifications/          #   Notification center
│  │  │  ├─ audit-logs/             #   Audit trail
│  │  │  └─ settings/               #   Settings, security, config
│  │  └─ (auth)/                    # Unauthenticated auth flows
│  │     ├─ login/  forgot-password/  reset-password/  accept-invitation/
│  ├─ components/
│  │  ├─ ui/                        # shadcn-style primitives
│  │  └─ shared/                    # AppShell, nav, bell, user menu, breadcrumbs, page header
│  ├─ features/                     # Feature modules (types → schemas → api → queries → components)
│  │  ├─ auth/ orders/ dispatch/ drivers/ vehicles/ customers/ zones/
│  │  ├─ service-types/ reports/ notifications/ audit-logs/ settings/ config-management/
│  └─ lib/
│     ├─ api/                       # client, server-client, errors, session, shared DTO types
│     ├─ auth/                      # redirect helpers
│     ├─ query/                     # QueryClient factory + provider
│     └─ utils/                     # cn, formatters
├─ Docs/                            # SRS + implementation plan (see Documentation)
├─ next.config.ts                   # API proxy rewrite
└─ components.json                  # shadcn configuration
```

Each feature follows the same internal layering:

```
features/<domain>/
├─ types.ts      # DTOs mirroring the backend contract
├─ schemas.ts    # Zod schemas for forms / URL param parsing
├─ api.ts        # Thin typed functions over apiFetch
├─ queries.ts    # Query keys, hooks, mutations, idempotency helpers
└─ components/   # Domain UI (explorers, dialogs, detail views)
```

---

## Getting started

### Prerequisites

- **Node.js 20+** and npm
- The **Deliverix backend** running and reachable (Express 5 + Prisma + PostgreSQL)
- A seeded user account with appropriate role/permissions

### Install & run

```bash
# 1. Install dependencies
npm install

# 2. Configure the backend URL (see Environment variables)
#    .env
#    BACKEND_URL=http://localhost:4000

# 3. Start the backend (separate terminal, from the Deliverix repo)
#    PORT=4000 npm run dev

# 4. Start the frontend (http://localhost:3000)
npm run dev
```

The dev server proxies `/api/v1/*` to `BACKEND_URL`; open http://localhost:3000 and sign in.

### Production build

```bash
npm run build
npm run start
```

---

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `BACKEND_URL` | No | `http://localhost:4000` | Base URL of the Express backend. Used by the Next.js rewrite and by `serverFetch` for RSC-side requests. |

Create a `.env` (or `.env.local`) file in the project root:

```dotenv
BACKEND_URL=http://localhost:4000
```

> `BACKEND_URL` is server-only (it is never exposed to the browser). No secrets are committed to this repository.

---

## NPM scripts & quality gates

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js dev server (Turbopack). |
| `npm run build` | Production build. |
| `npm run start` | Serve the production build. |
| `npm run typecheck` | `tsc --noEmit` — strict type checking. |
| `npm run lint` | ESLint over the project. |

Every phase is considered complete only when all three gates pass:

```bash
npm run typecheck   # 0 errors
npm run lint        # 0 errors
npm run build       # 0 errors
```

> There is currently **no test runner** in this repository (see [Known deviations](#known-deviations--limitations)); `npm test` does not exist yet.

---

## API & data layer

### Envelope handling

The backend uses two response shapes, and the client unwraps them uniformly:

- **Bare single-resource envelope** `{ "data": { … } }` → returned as the resource itself.
- **Collection / paginated envelope** `{ "data": [ … ], "meta": { … } }` → preserved so callers can read `data`, `meta`, and `summary`.
- **204 / empty body** → `undefined`.

### Error model

Failures are normalized into a single `ApiError` with an RFC 9457 problem-details payload:

```ts
type ProblemDetails = {
  type?, title?, status, detail?, code?, requestId?, errors?
};
```

`messageFor(error)` maps statuses to user-safe messages — including first-class handling for **409 conflict**, **412 stale**, **428 precondition required**, **429 rate limited**, and **503 unavailable** — so business errors from the backend surface as clear, non-technical feedback. Retry classification only treats transient network/5xx failures as retryable; mutations never retry by default.

### Query client defaults

- Queries: 30s stale time, bounded retry for transient errors, no refetch-on-focus.
- Mutations: no automatic retry (idempotent critical mutations opt in via `Idempotency-Key`).
- Per-feature query-key factories keep cache invalidation predictable.

### Idempotency & concurrency

- **Idempotency:** create operations send a payload-stable `Idempotency-Key` (a SHA-256 hash of the canonical payload) so accidental double-submits replay safely.
- **Concurrency:** resources that expose a version use `If-Match` (→ 412/428 on stale writes). Resources without a version column (e.g. configuration) correctly omit it.

---

## Authentication & authorization

- **Session cookies:** the backend issues httpOnly `access_token` / `refresh_token` cookies; the same-origin proxy ensures they travel without CORS complexity.
- **Refresh:** a 401 on a non-auth endpoint triggers exactly one deduplicated refresh (concurrent 401s share a single in-flight promise) and a single retry. If refresh fails, a session-expired event clears cached data and redirects to login.
- **MFA:** login supports a TOTP challenge step; enrollment/confirmation is available under Settings → Security.
- **Access control:** navigation items and destructive/managing actions are gated by the user's effective permission list (e.g. `orders.view`, `dispatch.assign`, `drivers.manage`, `config.manage`, `reports.view`, `audit.view`). This is **presentation-only** — the backend is the enforcement point.

Current navigation permission mapping (`src/components/shared/nav-config.ts`):

| Screen | Permissions |
| --- | --- |
| Dashboard | _(any authenticated user)_ |
| Orders | `orders.view` |
| Dispatch | `dispatch.view-queue` |
| Drivers | `drivers.view` / `drivers.manage` / `dispatch.view-queue` |
| Vehicles | `vehicles.view` / `vehicles.manage` / `drivers.view` |
| Customers | `customers.view` / `customers.manage` |
| Zones | `zones.view` / `zones.manage` |
| Service Types | `config.manage` |
| Reports | `reports.view` |
| Notifications | `notifications.view` |
| Audit Logs | `audit.view` |
| Settings → System configuration | `config.manage` |

---

## Routes

| Route | Description |
| --- | --- |
| `/login`, `/forgot-password`, `/reset-password`, `/accept-invitation` | Authentication flows |
| `/dashboard` | Reporting dashboard (graceful fallback without `reports.view`) |
| `/orders`, `/orders/new`, `/orders/[orderId]` | Order list, creation, detail + proof of delivery |
| `/dispatch` | Dispatch board & assignment lifecycle |
| `/drivers`, `/drivers/[driverId]` | Driver registry & detail |
| `/vehicles`, `/vehicles/[vehicleId]` | Vehicle registry & detail |
| `/customers`, `/customers/[customerId]` | Customer directory & addresses |
| `/zones`, `/zones/[zoneId]` | Delivery zones |
| `/service-types` | Service type catalog |
| `/reports` | Deliveries / drivers / zones reports |
| `/notifications` | Notification center |
| `/audit-logs` | Read-only audit trail |
| `/settings`, `/settings/security`, `/settings/config` | Profile, MFA, system configuration |

---

## Conventions & constraints

- Business records are never hard-deleted via APIs — **status/deactivation only**.
- Order state and assignment state are **separate lifecycles**; assignments never force order status.
- Every workflow transition is validated against committed state by the backend (no arbitrary status setters).
- Retryable mutations support `Idempotency-Key`; stale writes use `If-Match` → `412`/`428`.
- Domain change + outbox event + critical audit writes commit in one transaction (backend).
- Money is represented as Prisma `Decimal` (never float); timestamps are UTC.
- IDs are non-enumerable opaque `cuid`-style values (never auto-increment).
- DTOs / safe projections only — Prisma models are never serialized; unknown mutation fields are rejected.
- Cursor pagination defaults to 20, max 100.
- Forms use React Hook Form + Zod; effect-based state resets are avoided in favour of keyed remounts / `handleOpenChange`.
- No comments in source unless they clarify non-obvious intent; no secrets committed.

---

## Deployment

1. Build with `npm run build` and run with `npm run start` behind a reverse proxy.
2. Set `BACKEND_URL` to the backend's internal URL so the `/api/v1` rewrite and server-side fetches resolve.
3. Prefer terminating TLS and serving the frontend and backend under **one origin** (the `/api/v1` rewrite already models this); if you front both behind a shared reverse proxy, the Next.js rewrite can be removed and the proxy configured instead.
4. Ensure httpOnly auth cookies are configured with appropriate `Secure` / `SameSite` attributes for your topology.

---

## Known deviations & limitations

- **Hand-written API types (SRS API-001..004).** The SRS mandates an OpenAPI-generated client; the backend does not yet publish an OpenAPI document, so this repo ships a single, well-typed hand-written client and DTOs (documented in `src/lib/api/types.ts`). Revisit if the backend starts publishing OpenAPI.
- **No test runner.** The repository has no Vitest/Jest/Playwright setup yet; frontend test requirements (`TEST-FE-*`, including the login→order→dispatch→delivery E2E flow) remain a follow-up.
- **Surfaces absent from the backend are intentionally omitted:** there is no tracking/ETA endpoint, no separate `settings` module (only MFA + config management), and no API-token module — so no UI is built for them.
- **Remaining lint warnings** are non-blocking React-Compiler notes about React Hook Form's `watch()` and a few unused imports in earlier-phase files.

---

## Roadmap

1. Re-verify the backend build/lint/typecheck against the current contract assumptions.
2. Introduce a test runner and implement `TEST-FE-*` (unit + E2E), wired into CI:
   `typecheck && lint && build && test`.
3. Adopt OpenAPI-generated types if/when the backend publishes a spec.
4. Resolve the remaining lint warnings.

---

## Documentation

- **Frontend SRS** — `Docs/Delivery_Management_System_Frontend_SRS_v1_Industry_Standard.md`
- **Implementation plan & phase history** — `Docs/IMPLEMENTATION_PLAN.md`
- **Backend** — sibling `Deliverix` repository (Express + Prisma + PostgreSQL; contract under `src/modules/**`)

---

> Backend owns the contracts and the authorization boundary; this app owns the experience. When in doubt, read the backend module before writing a client.
