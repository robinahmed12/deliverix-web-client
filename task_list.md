# Deliverix Web — Frontend Driver Journey Task List

This task list tracks the step-by-step implementation of the complete **Frontend Driver Journey Lifecycle** in `deliverix-web`, as specified in [Docs/frontend_driver_journey_implementation_plan.md](file:///C:/test/deliverix-web/Docs/frontend_driver_journey_implementation_plan.md) and [Docs/Delivery_Management_System_Frontend_SRS_v1_Industry_Standard.md](file:///C:/test/deliverix-web/Docs/Delivery_Management_System_Frontend_SRS_v1_Industry_Standard.md).

---

## Progress Dashboard

| Category | Total Tasks | Completed | In Progress | Pending | Completion Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Phase 1: Driver Availability & State Controls** | 3 | 3 | 0 | 0 | 100% |
| **Phase 2: Assignment Offer & Expiry Timer** | 3 | 3 | 0 | 0 | 100% |
| **Phase 3: Active Delivery Stepper & Quick Actions** | 4 | 4 | 0 | 0 | 100% |
| **Phase 4: Inline Proof of Delivery (POD) & Completion** | 3 | 3 | 0 | 0 | 100% |
| **Phase 5: Delivery Exception & Failure Reporting** | 3 | 3 | 0 | 0 | 100% |
| **Phase 6: Automated Testing & Responsive Validation** | 3 | 0 | 0 | 3 | 0% |
| **Total** | **19** | **16** | **0** | **3** | **~84%** |

```
Progress: [█████████████████▒▒▒] 84% (16 / 19 subtasks credited)
```

---

## Phase 1: Driver Availability & State Controls

> Status: **Completed (100%)**

- [x] **Task 1.1**: Driver availability toggle on dashboard and assignments view (`PUT /api/v1/drivers/me/availability`).
  - *Files*: `src/features/drivers/api-me.ts`, `src/features/drivers/components/driver-dashboard-view.tsx`
- [x] **Task 1.2**: Backend-controlled state protection (disable manual toggle when `Assigned` or `OnDelivery`).
  - *File*: `src/features/drivers/components/driver-dashboard-view.tsx`
- [x] **Task 1.3**: Visual status badges for all 5 driver states (`Available`, `Assigned`, `OnDelivery`, `Offline`, `Unavailable`).
  - *File*: `src/features/drivers/components/driver-dashboard-view.tsx`

---

## Phase 2: Assignment Offer & Expiry Timer

> Status: **Completed (100%)**
>
> Requirements: `DRV-UI-004`, `DRV-UI-005`, `DRV-UI-008`.

- [x] **Task 2.1**: Implement `assignment-countdown.tsx` component.
  - Real-time countdown to `offerExpiresAt`.
  - Visual urgency indicator (amber badge, pulses red when <60s remaining).
  - *File*: [assignment-countdown.tsx](file:///C:/test/deliverix-web/src/features/drivers/components/assignment-countdown.tsx)
- [x] **Task 2.2**: Implement `reject-offer-dialog.tsx`.
  - Captures reason code (`VEHICLE_ISSUE`, `DISTANCE_TOO_FAR`, `SHIFT_ENDED`, `OTHER`) and optional notes before calling `rejectAssignment`.
  - *File*: [reject-offer-dialog.tsx](file:///C:/test/deliverix-web/src/features/drivers/components/reject-offer-dialog.tsx)
- [x] **Task 2.3**: Wire countdown timer and reject dialog into `driver-dashboard-view.tsx` and `assignments/page.tsx`.
  - *Files*: [driver-dashboard-view.tsx](file:///C:/test/deliverix-web/src/features/drivers/components/driver-dashboard-view.tsx), [assignments/page.tsx](file:///C:/test/deliverix-web/src/app/(app)/drivers/assignments/page.tsx)

---

## Phase 3: Active Delivery Stepper & Quick Actions

> Status: **Completed (100%)**
>
> Requirements: `DRV-UI-006`, `DRV-UI-007`, `RESP-002`, `RESP-005`.

- [x] **Task 3.1**: Implement visual delivery milestone stepper on active delivery card.
  - Displays progress: `Assigned` &rarr; `Picked Up` &rarr; `In Transit` &rarr; `Out for Delivery` &rarr; `Delivered`.
  - *File*: [delivery-journey-stepper.tsx](file:///C:/test/deliverix-web/src/features/drivers/components/delivery-journey-stepper.tsx)
- [x] **Task 3.2**: Add quick contact and navigation links.
  - One-tap phone dialer button (`tel:${customerPhone}`).
  - One-tap Google Maps directions link for pickup and delivery addresses.
  - *Files*: [driver-dashboard-view.tsx](file:///C:/test/deliverix-web/src/features/drivers/components/driver-dashboard-view.tsx), [assignments/page.tsx](file:///C:/test/deliverix-web/src/app/(app)/drivers/assignments/page.tsx)
- [x] **Task 3.3**: Single prominent primary action progression.
  - Prominent primary action progression (`Confirm Package Pickup`, `Start In-Transit`, `Mark Out for Delivery`) with loading spinners and min 44px tap targets.
  - *Files*: [driver-dashboard-view.tsx](file:///C:/test/deliverix-web/src/features/drivers/components/driver-dashboard-view.tsx), [assignments/page.tsx](file:///C:/test/deliverix-web/src/app/(app)/drivers/assignments/page.tsx)
- [x] **Task 3.4**: Customer notification confirmation feedback on every driver action.
  - Visual toast alerts on mutation success: *"Status updated: Customer notified via email and in-app alert"*.
  - *Files*: [driver-dashboard-view.tsx](file:///C:/test/deliverix-web/src/features/drivers/components/driver-dashboard-view.tsx), [assignments/page.tsx](file:///C:/test/deliverix-web/src/app/(app)/drivers/assignments/page.tsx)

---

## Phase 4: Inline Proof of Delivery (POD) & Completion

> Status: **Completed (100%)**

- [x] **Task 4.1**: Proof of Delivery API integration.
  - Upload photo (`POST /api/v1/files/upload`), submit evidence (`POST /api/v1/orders/:id/proofs`), complete delivery (`POST /api/v1/orders/:id/deliver`).
  - *Files*: `src/features/orders/api.ts`, `src/features/orders/queries.ts`
- [x] **Task 4.2**: Complete POD submission flow in `DriverDeliveryActions`.
  - Photo evidence, recipient name input, OTP verification, scan validation, and `If-Match: version` optimistic locking.
  - *File*: [driver-delivery-actions.tsx](file:///C:/test/deliverix-web/src/features/orders/components/driver-delivery-actions.tsx)
- [x] **Task 4.3**: Integrate "Complete Delivery & Submit POD" action on active delivery card.
  - Direct execution link to POD completion workflow when order is `OutForDelivery`.
  - *Files*: [driver-dashboard-view.tsx](file:///C:/test/deliverix-web/src/features/drivers/components/driver-dashboard-view.tsx), [assignments/page.tsx](file:///C:/test/deliverix-web/src/app/(app)/drivers/assignments/page.tsx)

---

## Phase 5: Delivery Exception & Failure Reporting

> Status: **Completed (100%)**

- [x] **Task 5.1**: Extend `src/features/drivers/api-me.ts` with failure reporting.
  - Added `failDeliveryOrder(orderId, data)`.
  - Added `getDeliveryFailureReasons()`.
  - *File*: [api-me.ts](file:///C:/test/deliverix-web/src/features/drivers/api-me.ts)
- [x] **Task 5.2**: Implement `fail-delivery-dialog.tsx`.
  - Select failure reason (`RECIPIENT_UNAVAILABLE`, `INCORRECT_ADDRESS`, `CUSTOMER_REFUSED`, `ACCESS_DENIED`, `SAFETY_HAZARD`).
  - Required notes field validation when `requiresText` is true.
  - *File*: [fail-delivery-dialog.tsx](file:///C:/test/deliverix-web/src/features/drivers/components/fail-delivery-dialog.tsx)
- [x] **Task 5.3**: Add "Report Delivery Issue" action on active delivery card.
  - Available whenever order is in active delivery (`PickedUp`, `InTransit`, `OutForDelivery`).
  - Triggers customer delivery failure notification email and releases driver capacity back to Available.
  - *Files*: [driver-dashboard-view.tsx](file:///C:/test/deliverix-web/src/features/drivers/components/driver-dashboard-view.tsx), [assignments/page.tsx](file:///C:/test/deliverix-web/src/app/(app)/drivers/assignments/page.tsx)

---

## Phase 6: Automated Testing & Responsive Validation

> Status: **Pending (0%)**
>
> Requirements: `TEST-FE-010`, `BROWSER-004`.

- [ ] **Task 6.1**: Implement Playwright E2E driver journey test suite.
  - Covers offer countdown, accept/reject, pickup, transit, out-for-delivery, inline POD, and completion.
  - *File*: `e2e/driver-journey.spec.ts`
- [ ] **Task 6.2**: Execute TypeScript strict mode typecheck and linting.
  - `npm run typecheck`
  - `npm run lint`
- [ ] **Task 6.3**: Verify mobile responsive touch target sizes (min 44px) across mobile browser viewports (375px & 414px).
