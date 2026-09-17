# Deliverix Web — Implementation Plan

**Repo:** `C:\test\deliverix-web` (Next.js 16 App Router, React 19, TypeScript strict)
**Source of truth:** `C:\test\Deliverix\Docs\Delivery_Management_System_Frontend_SRS_v1_Industry_Standard.md`
**Backend:** `C:\test\Deliverix` (Express 5 + Prisma + PostgreSQL, PORT 5000), contract in `src/modules/**` and live `src/app.ts` route mounts
**Last updated:** Post-Phase-8 live backend verification (order module E2E).

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
| 7 | Tracking & External events | done | see §3.7; gates green (typecheck/lint/build) |
| 8 | Reporting, notifications, hardening | done | see §3.8; gates green (typecheck/lint/build) |

## 3. Phase details (all phases complete)

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

### 3.7 Phase 7 — Tracking & External events (done)
> Re-scoped to what actually exists in the backend: there is **no** tracking/location/ETA endpoint, no public lookup surface, and no outbox consumer. The status timeline (`GET /orders/:id/history`) already rendered on the order detail page. The provably-existing "event/evidence" surface is the **delivery-proof module** — so Phase 7 delivered the authenticated Proof-of-Delivery viewer on the order detail page.
- `src/features/orders/types.ts` — `ProofEvidenceType` (RecipientName/Photo/Signature/ConfirmationFlag/Otp), `ProofStatus` (Pending/Accepted/Rejected), `ProofFileStatus`, `DeliveryProofFile`/`DeliveryProof` DTOs mirroring `proof.service.ts` (`signedUrl` only when file `Accepted`).
- `src/features/orders/api.ts` — `listOrderProofs` → `GET /orders/:id/proofs` (`orders.view`, cursor page).
- `src/features/orders/queries.ts` — `ordersKeys.proofs`, `useOrderProofs` (pageSize 100, 30s stale).
- `src/features/orders/components/proof-of-delivery.tsx` — evidence-type label, status badge (success/warning/destructive), recipient name / confirmation / OTP / file-with-signed-URL renders, corrected stamp, read-only.
- `order-detail-view.tsx` — new Proof of delivery card (server-seeded `initialProofs`); also removed pre-existing unused imports (lint warnings 22 → 15).
- `src/app/(app)/orders/[orderId]/page.tsx` — seeds proofs alongside order/history/notes.
- SRS: `TRK-*`/`EVENT-*`/`TEST-FE` public tracking do not exist in the backend; delivery-proof submission is the driver app's concern (`deliveries.execute`) — admin UI is read-only (`orders.view`).
- Gates: typecheck / lint / build green (0 errors).

### 3.8 Phase 8 — Reporting, notifications, hardening (done)
> Scope note: the backend has **no `settings` module and no API-token module** (`grep -r "apiToken\|api-token\|personalAccessToken"` over `src/modules/**` = 0 hits), so the SRS "API tokens" settings screen is dropped; `/settings/security` (MFA) already existed. Reporting lives in `src/modules/reports/**`; audit in `src/modules/audit/**`; notifications in `src/modules/notifications/**`.
- `src/features/reports/`
  - `types.ts` — `ReportMeta`, `DashboardMetrics`, `DashboardReport`, `DeliveryReportRow`/`Summary`/`Response`, `DriverReportRow`/`Summary`/`Response`, `ZoneReportRow`/`Summary`/`Response`, param types. Dashboard `GET /reports/dashboard` returns a **single object** (unwrapped to `DashboardReport`); the other three return **collections** (preserved as `{data, summary, meta}`).
  - `schemas.ts` — `reportRangeSchema` (YYYY-MM-DD, `to >= from`, ≤90 days to mirror the backend cap).
  - `api.ts` — `getDashboardReport` (→`DashboardReport`), `getDeliveryReport`/`getDriverReport`/`getZoneReport` (→ responses), shared `buildQuery`.
  - `queries.ts` — `reportKeys`, `useDriverOptions` (`/drivers?active=true&pageSize=100` for the driver filter), `useDashboardReport` (optional `enabled`), `useDeliveryReport`/`useDriverReport`/`useZoneReport` (accept `null` params to disable), 60s stale.
  - Components: `dashboard-view.tsx` (date picker defaulting to today, metric cards, status distribution, driver availability, driver/zone performance tables, `hasPermission` + `initialData` props), `reports-explorer.tsx` (Deliveries/Drivers/Zones tabs, from/to + zone/status/driver filters, summary chips, tables, empty/loading states).
  - Pages: `(app)/dashboard` (server `serverFetch('/reports/dashboard')` in try/catch — 403 for users without `reports.view` renders a graceful fallback), `(app)/reports` (Breadcrumbs + explorer).
  - SRS: `RPT-*`; all endpoints `reports.view`; range cap enforced client-side to give a clear message instead of a backend 422.
- `src/features/notifications/`
  - `types.ts` — `AppNotification` (`channel`, `payload`, `readAt`, `orderId`), `NotificationListParams`, `NotificationMarkedRead`, `MarkAllReadResult`.
  - `api.ts` — `listNotifications` (cursor/pageSize/unreadOnly), `markNotificationRead` (`PATCH /notifications/:id/read`), `markAllNotificationsRead` (`PATCH /notifications/read-all`). Self-scoped; no `authorize` needed.
  - `queries.ts` — `notificationKeys`, `useNotifications` (60s refetch), `useUnreadCount` (`meta.total` from `unreadOnly=true`), mark-read / mark-all-read mutations.
  - Components: `notifications-view.tsx` (unread-only toggle, card list, mark-read on open, "View order" deep link, mark-all-read). `src/components/shared/notification-bell.tsx` was **wired** (was a disabled placeholder): links to `/notifications` and shows an unread count badge (caps at 99+).
  - Page: `(app)/notifications`. SRS: `NOTIF-001..004`.
- `src/features/audit-logs/`
  - `types.ts` — `AuditLogEntry` (`actorId`, `actorType`, `action`, `resourceType`, `resourceId`, `before`/`after`, `reason`, `requestId`, `ip`, `result`, `occurredAt`), `AuditListParams`.
  - `api.ts` — `listAuditLogs` (`GET /audit`, cursor + from/to/actorId/action/resourceType/resourceId, `audit.view`).
  - `queries.ts` — `auditKeys`, `useAuditLogsInfinite` (cursor `useInfiniteQuery`, pageSize 20, 15s stale).
  - Component `audit-logs-view.tsx` — datetime range + action + resource-type filters, read-only table (result badge, IP), expandable before/after JSON + reason (`<details>`), load-more. Immutable records — no write surface.
  - Page: `(app)/audit-logs`. SRS: `AUD-UI-*`.
- `src/features/settings/components/settings-view.tsx` + `(app)/settings` — profile card (`useCurrentUser`: name/email/status/roles/permission count/MFA), links to Security & MFA and (when `config.manage`) System configuration, and "Sign out all devices" (`POST /auth/logout-all` → clear cache → `/login`). `/settings/security` (MFA) unchanged.
- `src/features/config-management/`
  - `types.ts`/`schemas.ts`/`api.ts`/`queries.ts` — failure reasons (`GET` authenticated; `POST` idempotent + `PATCH` `config.manage`), proof policies (`GET` authenticated; `POST` idempotent + `PATCH active` `config.manage`), system settings (`GET`/`PATCH` `config.manage`). Collection envelopes (`{data:[...]}`) preserved; single-resource `{data:{...}}` unwrapped; payload-stable `useIdempotencyKey`.
  - Component `config-management-view.tsx` — tabs: Failure reasons (add/edit/toggle-active), Proof policies (create with requirement checkboxes + `minPhotos`, activate), System settings (JSON value editor; sensitive values redacted in the table, entered fresh on edit).
  - Page: `(app)/settings/config` (linked from `/settings` only for `config.manage`).
- Hardening (SRS §38 / Appendix E mutation review):
  - **Ownership / who may call**: every phase-8 mutation is backend-guarded — `config.manage` for all config writes, `reports.view` for reports; notifications are self-scoped (404 on foreign id). The UI additionally hides config links for users without `config.manage`.
  - **Idempotency**: create failure reason and create proof policy send `Idempotency-Key` derived from a canonical JSON hash of the payload (stable across retries, rotates when the payload changes). Toggle/activate/update-setting are naturally idempotent (set-to-value semantics).
  - **Concurrency/If-Match**: phase-8 resources have no version column in the backend, so no `If-Match` is sent for them (correct per contract); order/driver/vehicle writes from earlier phases already use `If-Match`.
  - **Stable errors**: all mutations surface `messageFor(error, …)` (429 rate-limit feedback included centrally in `errors.ts`); server errors render in an `Alert` without leaking raw payloads.
  - **Sensitive data**: settings marked `sensitive` are displayed redacted (`••••••••`) and never pre-filled into the edit form; audit `before`/`after` for sensitive settings is `[REDACTED]` server-side already.
  - **Audit/outbox**: no frontend action bypasses backend audit; audit log screen is read-only by design (there is intentionally no mutation surface).
  - **No test runner**: `package.json` has only `dev/build/start/typecheck/lint` (no vitest/jest/playwright). `TEST-FE-001..006` (incl. `TEST-FE-005` E2E login→order→dispatch→delivery) remain a **repo-level follow-up** — noted rather than silently skipped.
- Gates: typecheck / lint / build green (0 errors; 16 lint warnings — pre-existing RHF `watch()` compiler notes + a few unused imports in earlier-phase files).

---

## 4. Current verification snapshot (Phase 8)

- `npm run typecheck` → 0 errors
- `npm run lint` → 0 errors (16 warnings: RHF `watch()` React-Compiler notes in dispatch/drivers/vehicles plus a few pre-existing unused imports in `orders/**` — all phase-8 files are warning-free)
- `npm run build` → 24 routes generated; `/dashboard`, `/reports`, `/notifications`, `/audit-logs`, `/settings`, `/settings/config` are dynamic/SSR; 0 errors
- Backend `C:\test\Deliverix`: not re-verified this phase; contracts read from `src/modules/reports/**`, `notifications/**`, `audit/**`, `config-management/**`, `auth/**`. Confirmed **no `settings` module, no API-token module, and no tracking/ETA endpoint** exist anywhere in the backend.

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

All planned phases are complete. Post-Phase-8 **live verification** against the running backend (`:5000`) uncovered and fixed one blocking backend bug plus three frontend gaps:

- **Backend fix** — `C:\test\Deliverix\src\shared\middleware\validate.ts`: Express 5 exposes `req.query` as a getter-only accessor, so `req.query = parsed` threw a `TypeError` and **every query-validated route returned 500** (all list endpoints: orders, customers, zones, service-types, drivers, vehicles, notifications, reports). Now shadowed via `Object.defineProperty`. Regression test added at `tests/shared/validate.test.ts` (first backend test; `supertest` was already a devDependency) → `npm test` = 3 passed.
- **Frontend base paths** — `config-management/api.ts` corrected to `/config/failure-reasons|proof-policies|settings` and `audit-logs/api.ts` to `/audit-logs`, matching the live `src/app.ts` mounts (`/api/v1/config`, `/api/v1/audit-logs`).
- **`orders/types.ts`** — `OrderItem` decimals (`weight`, `lengthCm`, `widthCm`, `heightCm`) are `string | null`, matching Prisma `Decimal` JSON serialization (`deliveryFee` was already `string`).
- **`orders/components/create-order-form.tsx`** — replaced the non-functional customer field (raw input wrote a name into the `customerId` cuid field and search results were never rendered) with a debounced customer search/select picker; fixed the `useWatch`/`useMemo` compiler warnings.

**Verified E2E** (direct and via the Next.js proxy): `POST /auth/login` 200 → `POST /customers` 201 → `POST /orders` 201 (`ORD20260917788804`) → `GET /orders/:id` 200 → `/history` 200 → `/notes` 200 → list 200; reports/notifications/audit-logs/config all 200.

Remaining follow-ups:
1. **Frontend test runner** (repo has none): add vitest/RTL + Playwright and implement `TEST-FE-001..006`, including the `TEST-FE-005` E2E flow login→order→dispatch→delivery; wire CI to `typecheck && lint && build && test`.
2. Optionally replace hand-written DTOs with **OpenAPI-generated types** (deviation documented in `src/lib/api/types.ts`).
3. Resolve the remaining lint warnings (RHF `watch()` compiler notes + unused imports in `orders/**`).
4. Extend backend test coverage beyond `tests/shared/validate.test.ts`.
