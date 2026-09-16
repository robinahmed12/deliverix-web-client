# Deliverix Web — Implementation Plan

**Repo:** `C:\test\deliverix-web` (Next.js 16 App Router, React 19, TypeScript strict)
**Source of truth:** `C:\test\Deliverix\Docs\Delivery_Management_System_Frontend_SRS_v1_Industry_Standard.md`
**Backend:** `C:\test\Deliverix` (Express 5 + Prisma + PostgreSQL, PORT 4000), contract in `src/modules/**`
**Last updated:** Phase 2 verified.

---

## 1. How this plan works

- The backend is the authority for **contracts** (routes, DTOs, error codes, permissions).
- The frontend SRS is the authority for **behavior** (`REND-*`, `LIST-*`, `AUTH-*`, `TEST-FE-*`) and UI requirements (`ORD-UI-*`, `DSP-UI-*`, `DRV-UI-*`, …).
- Deliver in **phases**; each phase ends with the same three gates on **both** repos:
  1. `npm run typecheck` (tsc `--noEmit`, strict)
  2. `npm run lint` (eslint, 0 errors)
  3. `npm run build` (next build / backend tsc build) — 0 errors
- A phase is **not done** until the gates and its feature checklist (section 3) pass. Stop and report after each phase (do not chain phases without approval).

---

## 2. Verified phases

| # | Phase | Status | Notes |
|---|-------|--------|-------|
| 0 | Scaffold Next.js app + repo conventions | done | Next 16.3.5 App Router, TypeScript strict, ESLint, path aliases `@/*` |
| 1 | Foundation — shell, auth, API/query infra | done | see §3.1; gates green on both repos |
| 1.5 | shadcn preset theme (`base-nova`/`mist`) | done | `npx shadcn@init --preset b1sAoDbjE --template next`; button `asChild` restored; `cn` from `internal-preview` pkg |
| 2 | Orders feature | done | see §3.2; gates green both repos (§4) |

## 3. Remaining phases

### 3.1 Phase 1 — Foundation (done)
- App shell: `(app)` route group + `AppShell` layout with cookie/session guard; auth pages `(auth)` (login incl. MFA step, forgot/reset password, accept-invitation).
- API infra: `apiFetch`/`serverFetch` typed clients, `PaginatedResponse`/`PageMeta` types, error helpers (`messageFor`, `ProblemDetails`), auth header propagation, idempotency/version client support (`Idempotency-Key`, `If-Match`, `W/` versions).
- Query infra: TanStack Query v5 provider, devtools, `queryKeys` factory pattern, mutation options with idempotency + optimistic updates.
- Shared UI: `Button` (+`asChild`), `Card`, `Input`, `Label`, `Alert`, `Form` (react-hook-form helpers), `PageHeader`, `Breadcrumbs`, `feature-placeholder`.
- Feature scaffolding: `customers`, `zones`, `vehicles`, `drivers`, `service-types`, `dispatch` placeholders; `Dashboard`, `Settings` (profile + security + backup codes? pending), etc.

### 3.2 Phase 2 — Orders (done)
- Models/schemas: `Order`, `OrderStatus` (11 states), `OrderItem`, `OrderAddress`, `OrderNote`, `OrderStatusHistoryEntry`, summaries (`CustomerSummary`, `ZoneSummary`, `ServiceTypeSummary`, `ServiceTypeExtended`), Zod v4 schemas (`createOrderSchema`, `updateOrderSchema`, `orderListParamsSchema`, coerce forms).
- API: `listOrders/getOrder/createOrder/updateOrder/markOrderReady/cancelOrder/addOrderNote/addInternalNote/getOrderHistory/getOrderNotes` + status/zone/service-type reference fetch; idempotency + `If-Match` version support.
- Query hooks: `useOrdersInfinite`, `useOrder`, `useOrderHistory`, `useOrderNotes`, `useCreateOrderMutation`, `useUpdateOrderMutation`, `useMarkOrderReadyMutation`, `useCancelOrderMutation`, `useCustomerSearch`, `useZones`, `useServiceTypes`, `useCurrentUser`.
- UI: `OrdersExplorer` (URL-state filters/status/search, server `initialData` + infinite list), `OrderStatusBadge`, `AddressBlock`, `CreateOrderForm` (multi-section: customer/zone/service-type pickers, pickup+delivery addresses, items, timings, fee override), `OrderDetailView` (history timeline, notes).
- Pages: `(app)/orders`, `(app)/orders/[orderId]`, `(app)/orders/new` (server-loaded reference data + client form).

### 3.3 Phase 3 — Dispatch (NOT STARTED)
- Feature: `src/features/dispatch/`
  - `types.ts` — `DispatchRun`, `DispatchAssignment`, `AssignmentStatus` (`Planned`/`Reserved`/`Accepted`/`Active`/`Completed`/`Cancelled`/…), vehicle snapshot.
  - `schemas.ts` (Zod v4) — `assignOrderSchema`, `createDispatchRunSchema`, `withdrawAssignmentSchema`, `acceptAssignmentSchema` (per §7.2 lifecycle), `scanAssignSchema`.
  - `api.ts` — list/get dispatch runs + assignments, create run, assign/withdraw/accept order-to-run; idempotency + version support.
  - `queries.ts` — `dispatchRunKeys`, `useDispatchRunsInfinite`, `useDispatchRun`, `useAssignmentsForRun`, mutations.
  - Components: `dispatch-board.tsx` (run + assignment explorer), `assign-order-dialog.tsx`, `accept-assignment-flow.tsx` (withdraw/accept), run detail view with assignment table.
  - Pages: `(app)/dispatch`, `(app)/dispatch/[runId]`.
- SRS: `DSP-UI-001..015`, `DSP-ASSIGN-*`, `WF-001` lifecycle validation (order `Assigned` NOT set by offer per §7.1), at-most-one-open-assignment and one-accepted-per-driver invariants.
- Gates: same three gates + backend `dispatch` module (runs, assignments incl. concurrency `If-Match`).

### 3.4 Phase 4 — Drivers & Driver app onboarding data (NOT STARTED)
- `src/features/drivers/` — driver list/detail, status transitions (Active/Inactive/Suspended per AUD/business), per-driver assignment/vehicle snapshot; pickers reused by dispatch.
- SRS: `DRV-UI-001..010`, `PERM` driver permission usage.

### 3.5 Phase 5 — Vehicles (NOT STARTED)
- `src/features/vehicles/` — list/detail, zone service config, status, ROUTE-UI; reuse in dispatch.

### 3.6 Phase 6 — Customers, Zones & Service Types management (NOT STARTED)
- `src/features/customers/` — full CRUD UI (list/detail/edit/reactivate), address book, `customers.manage` perm.
- `src/features/zones/` — zone CRUD + zone-service fee config (`config.manage`).
- `src/features/service-types/` — CRUD; used in order create flow already.
- SRS: `CUST-UI-001..014`, `ZONE-UI-001..012`, `SVC-*`.

### 3.7 Phase 7 — Tracking & External events (NOT STARTED)
- `src/features/tracking/` — public tracking lookup by tracking number; live map/status timeline; webhook/outbox consumer surface (backend).
- SRS: `TRK-*`, `EVENT-*`, `TEST-FE` public tracking flow.

### 3.8 Phase 8 — Reporting, notifications, hardening (NOT STARTED)
- `src/features/reports/`, `src/features/notifications/`, `src/features/audit-logs/` (admin), `src/features/settings/` (profile, MFA, api tokens).
- Hardening: systematic per-mutation SRS Appendix E review (who may call / ownership / states / If-Match / Idempotency-Key / audit / outbox / stable errors), rate-limit UI feedback, sensitive-data logging audit, concurrency + idempotency retry UI tests.
- SRS: `RPT-*`, `NOTIF-*`, `AUD-UI-*`, `TEST-FE-001..006`, E2E login→order→dispatch→delivery (`TEST-FE-005`).

---

## 4. Current verification snapshot (Phase 2)

- `npm run typecheck` → 0 errors
- `npm run lint` → 0 errors
- `npm run build` → 21 routes, Orders list/detail/new dynamic (SSR), `0 / __next` OK
- Backend `C:\test\Deliverix`: `npm run build` + `typecheck`-style gate green.

---

## 5. Standing conventions / constraints (do not re-litigate)

- Business records are never hard-deleted via APIs — status/deactivation only (`BR-002`, `ORD-010`).
- Order state and assignment state are separate lifecycles; offers/assignments never set Order to `Assigned` (§7.1).
- At most one open assignment per order; one reserved/accepted assignment per driver (initial policy).
- Every workflow transition validated against committed state (`WF-001`); no arbitrary status-set endpoints.
- Retryable mutations MUST support `Idempotency-Key` (24h); stale writes use `If-Match` → 412/428.
- Domain change + outbox event commit in one Postgres transaction (`TXN-003`); critical audit writes same transaction (`AUD-003`).
- Money = Prisma `Decimal` (never float); timestamps UTC (`DATA-010/011`).
- Non-enumerable opaque IDs (`cuid`-style), never auto-increment.
- DTOs / safe projections only — never serialize Prisma models (`API-004`); unknown mutation fields rejected (`API-005`).
- Cursor pagination: default 20 / max 100 (`PAGE-001..002`).
- Never commit secrets; no comments unless clarifying.

---

## 6. How to resume

Continue at **Phase 3 (Dispatch)**. First check backend `src/modules/dispatch/**` (routes/schemas/service) to mirror DTOs before writing frontend feature. Then follow §3.3 checklist and close with the three gates on both repos.
