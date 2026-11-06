# Frontend Customer Journey & Customer Portal Implementation Plan

## Goal Description

In Deliverix, the customer web interface is the primary self-service touchpoint for recipients and registered customers to track their delivery packages in real time, manage saved delivery addresses, request order cancellation or rescheduling within permitted lifecycle boundaries, and interact with the **AI Customer Support Concierge (RAG)** powered by LangChain and OpenRouter.

This plan details the complete **Frontend Customer Journey Lifecycle** for `deliverix-web`, fully aligned with:
- **Frontend SRS (v1.0)**: Section 19 (`CUST-UI-001..005`), Section 18 (`TRACK-001..005`), and Section 21 (`RESP-002..005`).
- **Backend SRS (v2.0)**: Customer Lifecycle (`CUS-001..006`), Order Boundaries (`ORD-008..009`), Rescheduling (`RSC-001..003`), and Privacy Redaction (`PRIV-005`).
- **Backend APIs**: Versioned `/api/v1` endpoints under `/customers/me`, `/customers/me/addresses`, `/orders/:id/cancel`, and `/support/chat`.

---

## User Review Required

> [!IMPORTANT]
> **Strict Customer Boundary Isolation (`CUS-006`, `PRIV-005`)**:
> The customer experience must strictly isolate data so customer users only access their own linked resources. The customer UI must NEVER expose:
> 1. Internal staff notes (`InternalNote`) or internal audit logs (`AuditLog`).
> 2. Other customers' contact details or address records.
> 3. Full historical driver routes (only latest coordinates during active `InTransit` / `OutForDelivery`, disappearing at terminal state).
> 4. Staff-only mutation actions (e.g. manual dispatch, fee overrides, vehicle allocation).

> [!NOTE]
> **Dual-Channel Customer Self-Service & AI Support Concierge**:
> In addition to standard visual tracking steppers, the customer experience embeds the **Deliverix AI Support Concierge (RAG Widget)** connected to `/api/v1/support/chat`. The AI assistant is grounded in real-time order context and Deliverix policies, and dynamically suggests one-tap quick actions (e.g. *Track Order*, *Cancel Order*, *Reschedule*).

---

## Customer Lifecycle & Journey Architecture

```mermaid
flowchart TD
    subgraph Customer Portal Navigation
        Root["/portal (Customer Dashboard)"] --> OrdersView["/portal/orders (Order History & Active Deliveries)"]
        Root --> OrderDetail["/portal/orders/:id (Live Timeline & POD)"]
        Root --> AddressesView["/portal/addresses (Saved Address Book)"]
        Root --> ProfileView["/portal/profile (Settings & Account Link)"]
        Root --> AIChat["AI Support Concierge Widget (/api/v1/support/chat)"]
    end

    subgraph Order Lifecycle Transitions (Customer View)
        Pending["1. Pending\n(Readiness check)"] --> Ready["2. Ready for Pickup\n(Dispatched to queue)"]
        Ready --> Assigned["3. Driver Assigned\n(Customer receives Driver details)"]
        Assigned --> PickedUp["4. Picked Up\n(Driver took custody)"]
        PickedUp --> InTransit["5. In Transit\n(Package on route)"]
        InTransit --> OutForDelivery["6. Out for Delivery\n(Proximity alert)"]
        OutForDelivery --> Delivered["7. Delivered\n(View Photo & Signature POD)"]

        Pending --> CancelAction["Customer Self-Service Cancel\n(ORD-008: Permitted)"]
        Ready --> CancelAction
        PickedUp -.-> CancelBlocked["Cancel Prohibited\n(Package in transit)"]
        OutForDelivery --> FailedAttempt["Attempt Failed\n(View failure reason & reschedule)"]
    end
```

---

## Detailed Journey Phases

### Phase 1: API Client & Query Layer Integration
- **Target Files**:
  - `src/features/customers/api.ts`
  - `src/features/customers/queries.ts`
  - `src/features/customers/types.ts`
  - `src/features/support-rag/` (New feature slice)
- **Endpoints Connected**:
  - `GET /api/v1/customers/me` &rarr; `getMyProfile()`
  - `PATCH /api/v1/customers/me` &rarr; `updateMyProfile()`
  - `POST /api/v1/customers/me/link-account` &rarr; `linkAccount()`
  - `GET /api/v1/customers/me/addresses` &rarr; `listMyAddresses()`
  - `POST /api/v1/customers/me/addresses` &rarr; `createMyAddress()`
  - `PATCH /api/v1/customers/me/addresses/:id` &rarr; `updateMyAddress()`
  - `DELETE /api/v1/customers/me/addresses/:id` &rarr; `deleteMyAddress()`
  - `POST /api/v1/orders/:id/cancel` &rarr; `customerCancelOrder()`
  - `POST /api/v1/support/chat` &rarr; `sendSupportChatMessage()`
  - `GET /api/v1/support/faq` &rarr; `listSupportFaqs()`

### Phase 2: Customer Portal Layout & Dashboard (`/portal`)
- **Portal Shell**: Clean, modern, responsive layout tailored for customers with navigation links (`My Orders`, `Address Book`, `Profile`, `Support`).
- **Active Delivery Card**: Prominently displays active order in flight:
  - Big status badge (`Out for Delivery`, `In Transit`, `Assigned`, etc.)
  - ETA promise delivery window
  - Assigned driver first name & driver code (when assigned)
  - One-tap "Track Live" button
- **Quick Stats Bar**: Total deliveries, active packages, saved addresses count.

### Phase 3: Visual Order Tracking & Live Timeline (`/portal/orders/[orderId]`)
- **Progress Stepper**: 7-stage visual milestone stepper:
  `Order Placed` &rarr; `Ready for Pickup` &rarr; `Driver Assigned` &rarr; `Picked Up` &rarr; `In Transit` &rarr; `Out for Delivery` &rarr; `Delivered`.
- **Driver Details Card**: When order is `Assigned` or later, displays driver code, phone contact button, and active attempt status.
- **Delivery Exception Card**: If status is `Failed`, displays high-visibility alert with reason code (e.g. `CUSTOMER_UNAVAILABLE`, `ACCESS_RESTRICTED`), driver explanation note, and a "Reschedule Retry" CTA button.
- **POD Evidence Viewer**: When `Delivered`, displays recipient name, delivery timestamp, and secure signed photo proof.
- **Customer Cancellation Dialog**: If status is `Pending` or `ReadyForPickup`, customer can click "Cancel Order", specify a reason, and confirm immediate atomic cancellation.

### Phase 4: Saved Address Book Manager (`/portal/addresses`)
- **Address Cards**: Shows label (`Home`, `Work`, `Other`), full formatted address, and `Default` badge.
- **Add/Edit Address Dialog**: Form with validation for line1, line2, city, state/region, zip code, and "Set as Default" checkbox.
- **Delete Address Confirmation**: Safe soft-deletion with undo toast.

### Phase 5: Profile & Verified Account Linking (`/portal/profile`)
- **Profile View**: Name, verified email, phone number, and account creation date.
- **Account Linking Card (`CUS-005`)**: For users who previously ordered as guests, allows one-tap linking of historical guest orders by verified email/phone matching.

### Phase 6: AI Support Concierge Chat Widget (`CustomerSupportChatWidget`)
- **Floating Launcher**: Bottom-right floating chat widget available across all customer portal pages.
- **Multi-Turn Chat Interface**: Messages, user query bubble, AI response bubble with markdown rendering.
- **Dynamic Quick Action Pills**: Direct buttons rendered based on the AI response (`Track Order #...`, `Cancel Order`, `Reschedule Delivery`, `Talk to Agent`).
- **Grounded Context Integration**: Automatically passes current `orderId` when chatting from an order details page.

---

## Technical Stack & Component Mapping

| UI Requirement | Technology / Component | Backend API |
| :--- | :--- | :--- |
| **State & Data Fetching** | `@tanstack/react-query` v5 | `/api/v1/customers/me/*` |
| **Form Validation** | `react-hook-form` + `zod` | Client & server schema parity |
| **UI Primitives** | Radix UI + Tailwind CSS v4 | Responsive mobile/desktop |
| **AI Support Stream/Chat** | Custom React Hook + LangChain backend | `/api/v1/support/chat` |
| **Notifications & Toasts** | `sonner` | Status feedback & alerts |

---

## Verification Plan

### Automated Tests
1. **API Client & Query Tests**:
   - Verify `getMyProfile`, `listMyAddresses`, and `customerCancelOrder` handle authentication tokens and errors properly.
2. **Customer Portal Component Tests**:
   - Verify active order card renders correct status badges and hides driver location in terminal states.
   - Verify cancel button is enabled only in `Pending` / `ReadyForPickup`.
3. **AI Chat Widget Tests**:
   - Verify question submission, response rendering, and quick action pill click handlers.
4. **Playwright E2E Flow**:
   - Customer login &rarr; View dashboard &rarr; Add saved address &rarr; View order timeline &rarr; Cancel order &rarr; Chat with AI concierge.

### Test Execution Commands
```bash
npm run typecheck
npm run lint
npm run test:e2e
```
