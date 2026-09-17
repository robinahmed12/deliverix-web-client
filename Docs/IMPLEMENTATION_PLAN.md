# Deliverix Web — Implementation Plan

**Repo:** `C:\test\deliverix-web` (Next.js 16 App Router, React 19, TypeScript strict)
**Source of truth:** `C:\test\Deliverix\Docs\Delivery_Management_System_Frontend_SRS_v1_Industry_Standard.md`
**Backend:** `C:\test\Deliverix` (Express 5 + Prisma + PostgreSQL, PORT 4000), contract in `src/modules/**`
**Last updated:** Phase 6 verified.

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
| 5 | Vehicles | done | see §3.5; gates green (typecheck/lint/build) |
| 6 | Customers, Zones & Service Types | done | see §3.6; gates green (typecheck/lint/build) |

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

### 3.5 Phase 5 — Vehicles (done)
> Mirrors the live backend contract (`src/modules/vehicles/**`): offset-paginated (`meta {page, pageSize, total, totalPages}`), writes gated on `drivers.manage` (+ `vehicles.manage` per seed for nav), reads on `drivers.view`/`drivers.manage`/`dispatch.view-queue`. No hard-delete surface — operational status (`Active`/`Maintenance`/`Inactive`) only.
- Feature: `src/features/vehicles/`
  - `types.ts` — `VehicleListItem`, `VehicleDetail` (+ `currentDriver`), `VehicleOperationalStatus`, `VehiclePage`/`VehicleListPage`, `AllocationResult`.
  - `schemas.ts` (Zod v4) — `vehicleListParamsSchema` (string-enum `status` for URL parse, coerce page/pageSize), `createVehicleSchema` (registration/type/capacity required), `updateVehicleSchema` (versioned PATCH, no registration change), `allocateVehicleSchema`.
  - `api.ts` — `listVehicles` (offset: `page`/`pageSize (≤100)`/`status`/`search`), `getVehicle`, `createVehicle` (idempotent), `updateVehicle` (`If-Match`), `allocateVehicle`/`deallocateVehicle` (idempotent).
  - `queries.ts` — `vehicleKeys`, `useVehiclesInfinite` (numeric `pageParam`, `page < totalPages` → next), `useVehicle`, `useDriverSearch` (allocate picker), create/update/allocate/deallocate mutations (invalidate `vehicleKeys.all` + `drivers`), `useVehiclePermissions` (`drivers.*`/`dispatch.view-queue` + seed `vehicles.*`), `useIdempotencyKey` (payload-stable).
  - Components: `vehicles-explorer.tsx` (search, status filter, table with status badge, load-more, row→detail), `create-vehicle-dialog.tsx`, `edit-vehicle-dialog.tsx` (status select + versioned PATCH), `allocate-vehicle-dialog.tsx` (driver search+pick, optional reason code), `vehicle-detail-view.tsx` (info + current driver, Edit/Allocate/Reassign/Release with two-step confirm for deallocate).
  - Pages: `(app)/vehicles` (server `initialData` page-1 + client infinite explorer, URL-filter driven), `(app)/vehicles/[vehicleId]` (server detail + `notFound()` on miss).
- SRS: vehicles surface per live backend contract (RFC scope); allocation invariants (single active allocation per driver/vehicle) enforced by the backend.
- Gates: typecheck / lint / build green (0 errors; 22 warnings — pre-existing RHF `watch()`/unused-import notes).

### 3.6 Phase 6 — Customers, Zones & Service Types management (done)
> Mirrors the live backend contracts (`src/modules/customers/**`, `src/modules/zones/**`, `src/modules/service-types/**`). Customers are offset-paginated with a soft-status (`active`/`inactive`); addresses are a `{data}` array envelope (soft-delete via `DELETE`, 204). Zones/service-types list as bare `{data: [...]}` (non-paged); zone `deliveryFee` (Prisma `Decimal`) arrives as a string; writes gated on `zones.manage` (zones) / `config.manage` (service types); reads are authenticated-but-not-authorized on the backend, so the screens gate by nav/perm while the backend remains the boundary.
- Features:
  - `src/features/customers/` — `types.ts` (`CustomerDetail` = list DTO; `CustomerAddress`, page/list types, wire `CreateCustomerPayload`/`UpdateCustomerPayload`/`AddressPayload` keeping form (`z.input`) types distinct), `schemas.ts` (list / create / update with email `""|null` clearing; `createAddressSchema` with string coords refined for range), `api.ts` (`listCustomers` offset, `getCustomer`, `createCustomer` idempotent, `updateCustomer` `If-Match`, `listAddresses`/`createAddress`/`updateAddress`/`deleteAddress`), `queries.ts` (`customerKeys`, `useCustomersInfinite`, `useCustomer`, `useCustomerAddresses`, 5 mutations, `useCustomerPermissions` (`customers.view`/`customers.manage`), `useIdempotencyKey`).
  - `src/features/customers/components/` — `customers-explorer.tsx` (search + status filter, table, load-more), `create-customer-dialog.tsx`, `edit-customer-dialog.tsx` (name/email/phone/status), `address-form-dialog.tsx` (single dialog for create+edit of the address book; `isDefault` checkbox; coords optional), `customer-detail-view.tsx` (info card, Activate/Deactivate via status PATCH, address book with per-address two-step delete confirm).
  - Pages: `(app)/customers` (server page-1 + client infinite), `(app)/customers/[customerId]` (`notFound()` on miss).
  - `src/features/zones/` — `types.ts` (`ZoneListItem`/`ZoneDetail`+`areas`, `CreateZonePayload`/`UpdateZonePayload`), `schemas.ts` (create incl. area rows, update w/ fee clearing), `api.ts`/`queries.ts` (`useZones` non-paged with `active`/`search`, `useZone`, `createZone`/`updateZone` mutations — no area-update surface on the backend), `useZonePermissions` (`zones.manage`).
  - `src/features/zones/components/` — `zones-explorer.tsx` (search + active filter, table w/ fee + priority), `create-zone-dialog.tsx` (optional coverage-area rows editor, fee, currency, priority), `edit-zone-dialog.tsx` (name/active/priority/fee), `zone-detail-view.tsx` (info + read-only areas, Activate/Deactivate toggle).
  - Pages: `(app)/zones` (server `{data}` fetch), `(app)/zones/[zoneId]` (`notFound()` on miss).
  - `src/features/service-types/` — `types.ts`/`schemas.ts`/`api.ts`/`queries.ts` (`useServiceTypes` non-paged, `useServiceType`, create/update; writes `config.manage`), list screen `service-types-explorer.tsx` + `create-service-type-dialog.tsx`/`edit-service-type-dialog.tsx` (keyed remount instead of effect-reset), page `(app)/service-types`.
  - `src/components/shared/nav-config.ts` — added "Service Types" nav item (`config.manage`).
- SRS: `CUST-UI-001..014`, `ZONE-UI-001..012`, `SVC-*`; admin config screens exercise backend-exposed management (no browser-computed fees — backend `Decimal` is authoritative).
- Gates: typecheck / lint / build green (0 errors; 22 pre-existing warnings — same RHF `watch()`/unused-import notes as Phase 5).

### 3.7 Phase 7 — Tracking & External events (NOT STARTED)
- `src/features/tracking/` — public tracking lookup by tracking number; live map/status timeline; webhook/outbox consumer surface (backend).
- SRS: `TRK-*`, `EVENT-*`, `TEST-FE` public tracking flow.

### 3.8 Phase 8 — Reporting, notifications, hardening (NOT STARTED)
- `src/features/reports/`, `src/features/notifications/`, `src/features/audit-logs/` (admin), `src/features/settings/` (profile, MFA, api tokens).
- Hardening: systematic per-mutation SRS Appendix E review (who may call / ownership / states / If-Match / Idempotency-Key / audit / outbox / stable errors), rate-limit UI feedback, sensitive-data logging audit, concurrency + idempotency retry UI tests.
- SRS: `RPT-*`, `NOTIF-*`, `AUD-UI-*`, `TEST-FE-001..006`, E2E login→order→dispatch→delivery (`TEST-FE-005`).

---

## 4. Current verification snapshot (Phase 6)

- `npm run typecheck` → 0 errors
- `npm run lint` → 0 errors (22 pre-existing warnings: order feature unused imports, and RHF `watch()` compiler notes in dispatch/drivers/orders/vehicles dialogs)
- `npm run build` → 24 routes generated, `/customers`, `/customers/[customerId]`, `/zones`, `/zones/[zoneId]`, `/service-types` dynamic (SSR), 0 errors
- Backend `C:\test\Deliverix`: not re-verified this phase; contracts per `src/modules/customers|zones|service-types/**` (customers offset-paged + address book, zones/service-types `{data: [...]}`). Two frontend/backend nits to revisit later: PathKit/leaf-style map for coverage areas (currently tabular), and zone-area editing (backend exposes areas only at create).

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

Continue at **Phase 7 (Tracking & External events — authenticated timeline only)**. Confirmed scope earlier: `GET /orders/:orderId/tracking` always returns `location: null`, `eta: null`; no public lookup, no live map. Build `src/features/tracking/` as a status/event timeline on the authenticated order detail page (reuse `getOrder`/`getOrderHistory`). Follow backend `src/modules/tracking/**` (+ `delivery/proof/files`, `config-management` for proof policies) before writing code, then close with the three gates on both repos.
