# Deliverix Web — Frontend Driver Journey Task List

This task list tracks the step-by-step implementation of the complete **Frontend Driver Journey Lifecycle** in `deliverix-web`, with explicit **Customer Email and In-App Notification triggers and UI feedback** on every driver status change, as specified in [Docs/frontend_driver_journey_implementation_plan.md](file:///C:/test/deliverix-web/Docs/frontend_driver_journey_implementation_plan.md) and [Docs/Delivery_Management_System_Frontend_SRS_v1_Industry_Standard.md](file:///C:/test/deliverix-web/Docs/Delivery_Management_System_Frontend_SRS_v1_Industry_Standard.md).

---

## Progress Dashboard

| Category | Total Tasks | Completed | In Progress | Pending | Completion Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Phase 1: Driver Availability & State Controls** | 3 | 3 | 0 | 0 | 100% |
| **Phase 2: Assignment Offer & Expiry Timer** | 3 | 3 | 0 | 0 | 100% |
| **Phase 3: Active Delivery Stepper & Quick Actions** | 4 | 0 | 1 | 3 | 25% |
| **Phase 4: Inline Proof of Delivery (POD) & Completion** | 3 | 0 | 0 | 3 | 0% |
| **Phase 5: Delivery Exception & Failure Reporting** | 3 | 0 | 0 | 3 | 0% |
| **Phase 6: Automated Testing & Responsive Validation** | 3 | 0 | 0 | 3 | 0% |
| **Total** | **19** | **6** | **1** | **12** | **~37%** |

```
Progress: [███████▒▒▒▒▒▒▒▒▒▒▒▒▒] 37% (7 / 19 subtasks credited)
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

> Status: **In Progress (25%)**
>
> Requirements: `DRV-UI-006`, `DRV-UI-007`, `RESP-002`, `RESP-005`.

- [ ] **Task 3.1**: Implement visual delivery milestone stepper on active delivery card.
  - Displays progress: `Assigned` &rarr; `Picked Up` &rarr; `In Transit` &rarr; `Out for Delivery` &rarr; `Delivered`.
  - *File*: `src/features/drivers/components/delivery-journey-stepper.tsx`
- [ ] **Task 3.2**: Add quick contact and navigation links.
  - One-tap phone dialer button (`tel:${customerPhone}`).
  - One-tap Google Maps directions link for pickup and delivery addresses.
  - *File*: `src/features/drivers/components/driver-dashboard-view.tsx`
- [x] **Task 3.3**: Single prominent primary action progression.
  - Current base buttons: "Confirm Pickup", "Start Transit", "Mark Out for Delivery".
  - *File*: `src/features/drivers/components/driver-dashboard-view.tsx`
- [ ] **Task 3.4**: Customer notification confirmation feedback on every driver action.
  - Visual toast alerts on mutation success: *"Status updated: Customer notified via email and in-app alert"*.
  - *Files*: `src/features/drivers/components/driver-dashboard-view.tsx`, `src/app/(app)/drivers/assignments/page.tsx`

---

## Phase 4: Inline Proof of Delivery (POD) & Completion

> Status: **Pending (0%)**
>
> Requirements: `POD-001..008`, `DRV-UI-006`, `DRV-UI-007`.

- [ ] **Task 4.1**: Extend `src/features/drivers/api-me.ts` with POD and completion functions.
  - Add `uploadDriverProofFile(orderId, file)`
  - Add `submitDriverProof(orderId, data)`
  - Add `completeDeliveryOrder(orderId, version)`
  - *File*: `src/features/drivers/api-me.ts`
- [ ] **Task 4.2**: Implement `complete-delivery-dialog.tsx`.
  - Photo evidence: file upload with instant camera capture and image preview.
  - Recipient name text input.
  - Unified submit: uploads proof photo &rarr; submits POD evidence &rarr; marks order `Delivered` with `If-Match: version` &rarr; triggers customer delivery receipt email.
  - *File*: `src/features/drivers/components/complete-delivery-dialog.tsx`
- [ ] **Task 4.3**: Integrate "Complete Delivery & Submit POD" action on active delivery card.
  - Appears as primary button when order is `OutForDelivery`.
  - *Files*: `src/features/drivers/components/driver-dashboard-view.tsx`, `src/app/(app)/drivers/assignments/page.tsx`

---

## Phase 5: Delivery Exception & Failure Reporting

> Status: **Pending (0%)**
>
> Requirements: `DRV-UI-006`, `ATT-004`.

- [ ] **Task 5.1**: Extend `src/features/drivers/api-me.ts` with failure reporting.
  - Add `failDeliveryOrder(orderId, data)`.
  - Add `getDeliveryFailureReasons()`.
  - *File*: `src/features/drivers/api-me.ts`
- [ ] **Task 5.2**: Implement `fail-delivery-dialog.tsx`.
  - Select failure reason (`RECIPIENT_UNAVAILABLE`, `INCORRECT_ADDRESS`, `CUSTOMER_REFUSED`, `ACCESS_DENIED`, `SAFETY_HAZARD`).
  - Required notes field.
  - *File*: `src/features/drivers/components/fail-delivery-dialog.tsx`
- [ ] **Task 5.3**: Add "Report Delivery Issue" action on active delivery card.
  - Available whenever order is in active delivery (`PickedUp`, `InTransit`, `OutForDelivery`).
  - Triggers customer delivery failure notification email.
  - *Files*: `src/features/drivers/components/driver-dashboard-view.tsx`, `src/app/(app)/drivers/assignments/page.tsx`

---

## Phase 6: Automated Testing & Responsive Validation

> Status: **Pending (0%)**
>
> Requirements: `TEST-FE-010`, `BROWSER-004`.

- [ ] **Task 6.1**: Implement Playwright E2E driver journey test suite.
  - Covers offer countdown, accept/reject, pickup, transit, out-for-delivery, inline POD, and completion with notification assertions.
  - *File*: `e2e/driver-journey.spec.ts`
- [ ] **Task 6.2**: Execute TypeScript strict mode typecheck and linting.
  - `npm run typecheck`
  - `npm run lint`
- [ ] **Task 6.3**: Verify mobile responsive touch target sizes (min 44px) across mobile browser viewports (375px & 414px).
