# Deliverix Web — Implementation Plan

**Repo:** `C:\test\deliverix-web` (Next.js 16 App Router, React 19, TypeScript strict)
**Source of truth:** `C:\test\Deliverix\Docs\Delivery_Management_System_Frontend_SRS_v1_Industry_Standard.md`
**Backend:** `C:\test\Deliverix` (Express 5 + Prisma + PostgreSQL, PORT 4000), contract in `src/modules/**`
**Last updated:** Phase 4 verified.

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
| 3 | Dispatch | done | see §3.3; gates green (typecheck/lint/build) |
| 4 | Drivers | done | see §3.4; gates green (typecheck/lint/build) |

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

### 3.3 Phase 3 — Dispatch (done)
> Scope note: the backend has **no `DispatchRun` concept** — the dispatch module mirrors the real contract (`src/modules/dispatch/**`): a cursor-paginated queue of ready/unassigned orders, driver workloads, and a per-order assignment lifecycle that never sets Order to `Assigned` (§7.1).
- Feature: `src/features/dispatch/`
  - `types.ts` — `DispatchQueueOrder`, `DispatchQueuePage` (`data` + `pageInfo {hasMore, nextCursor}`), `DriverWorkload`, `AssignmentHistoryEntry`, `AssignmentStatus` (Offered/Accepted/Rejected/Expired/Withdrawn/Released/Completed), `ACTIVE_ASSIGNMENT_STATUSES`.
  - `schemas.ts` (Zod v4) — `assignOrderSchema`, `reassignSchema` (reasonCode required), `withdrawAssignmentSchema`.
  - `api.ts` — `listDispatchQueue` (cursor + zoneId filter), `listDriverWorkloads` (state filter), `getAssignmentHistory`, `createAssignment` (`POST /orders/:id/assignments`, Offer), `reassignOrder`, `withdrawAssignment`, driver `acceptAssignment`/`rejectAssignment`; idempotency support; envelope reads (`result.data`/`result.pageInfo`) matching the API client contract.
  - `queries.ts` — `dispatchKeys`, `useDispatchQueueInfinite` (`pageInfo.nextCursor`, 10s refetch), `useDriverWorkloads`, `useDispatchedOrdersInfinite` (status `Assigned`), `useAssignmentHistory`, assign/reassign/withdraw/accept/reject mutations (invalidate `dispatchKeys.all`), `useDispatchPermissions` (`dispatch.view-queue`/`dispatch.assign`/`dispatch.reassign`), `useIdempotencyKey` (payload-stable).
  - Components: `dispatch-board.tsx` (Ready queue / In progress tabs, zone filter, load-more, driver workload card with state filter, assignment history, offers/withdraw/reassign actions), `order-queue-item.tsx`, `assign-order-dialog.tsx` (Available drivers, optional offer expiry), `reassign-dialog.tsx`, `withdraw-confirmation.tsx`, `assignment-history-table.tsx`.
  - Pages: `(app)/dispatch` (server-loaded queue/workloads/zones + client board).
- SRS: `DSP-*` queue & assignment workflows; at-most-one-open-assignment and single-accepted-per-driver invariants enforced by the backend.
- Gates: typecheck / lint / build green (0 errors).

### 3.4 Phase 4 — Drivers (done)
> Scope note: surfaced per the live backend contract (`src/modules/drivers/**`), which is offset-paginated (`meta {page, pageSize, total, totalPages}`) and has **no `name` on the Driver DTO** — display uses `driverCode`/`contactPhone`. Driver self-service endpoints (`/drivers/me/availability`, `/drivers/me/assignments`) are the driver MVP app's concern, not this admin UI.
- Feature: `src/features/drivers/`
  - `types.ts` — `DriverListItem` (no `name`), `DriverDetail` (+ `currentVehicle`), `DriverVehicle`, `DriverAvailabilityState` (Offline/Available/Assigned/OnDelivery/Unavailable), `DriverPage`/`DriverListPage`, `UserSummary` (account picker).
  - `schemas.ts` (Zod v4) — `driverListParamsSchema` (string-enum `active`→boolean transform for URL parse), `createDriverSchema` (accountId + contactPhone required), `updateDriverSchema`.
  - `api.ts` — `listDrivers` (offset: `page`/`pageSize (≤100)`/`state`/`active`/`search`), `getDriver`, `createDriver` (idempotent), `updateDriver` (`If-Match` version), `listUsers` (for the create-driver account picker, `users.view|users.manage`).
  - `queries.ts` — `driverKeys`, `useDriversInfinite` (numeric `pageParam`, `page < totalPages` → next), `useDriver`, `useUserSearch`, create/update mutations (invalidate `driverKeys.all`, seed detail cache), `useDriverPermissions` (`drivers.view`/`drivers.manage`), `useIdempotencyKey` (payload-stable).
  - Components: `drivers-explorer.tsx` (search, state/active `<select>` filters, table with state/status badges, load-more, row→detail), `create-driver-dialog.tsx` (user account search+pick list, optional code/license/qualification), `edit-driver-dialog.tsx` (contact/license/qualification, versioned PATCH), `driver-detail-view.tsx` (info + current vehicle, Edit + Activate/Deactivate via `active` toggle).
  - Pages: `(app)/drivers` (server `initialData` page-1 + client infinite explorer, URL-filter driven), `(app)/drivers/[driverId]` (server detail + `notFound()` on miss).
- SRS: `DRV-UI-001..010`; admins (`drivers.manage`) manage; dispatchers (`drivers.view`) read-only.
- Gates: typecheck / lint / build green (0 errors).

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

## 4. Current verification snapshot (Phase 4)

- `npm run typecheck` → 0 errors
- `npm run lint` → 0 errors (27 pre-existing warnings: Docs/src-extracted backend, orders feature unused imports, and RHF `watch()` compiler notes in orders/dispatch/drivers dialogs)
- `npm run build` → 21 routes generated, `/drivers` + `/drivers/[driverId]` dynamic (SSR), 0 errors
- Backend `C:\test\Deliverix`: not re-verified this phase; drivers endpoints (`/drivers`, `/drivers/:id`) + `/users` account picker assumed per contract from `src/modules/drivers/**` / `src/modules/users/**`.

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

Continue at **Phase 5 (Vehicles)**. First check backend `src/modules/vehicles/**` (routes/schemas/service) to mirror DTOs before writing `src/features/vehicles/`. Then follow §3.5 checklist and close with the three gates on both repos.
