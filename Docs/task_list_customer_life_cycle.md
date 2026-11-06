# Deliverix Web — Customer Lifecycle & Journey Frontend Task List

This task list tracks the step-by-step implementation of the **Customer Journey & Portal Frontend** in accordance with [Docs/customer-journey_fronted_implementation_plan.md](file:///C:/test/deliverix-web/Docs/customer-journey_fronted_implementation_plan.md) and [Docs/Delivery_Management_System_Frontend_SRS_v1_Industry_Standard.md](file:///C:/test/deliverix-web/Docs/Delivery_Management_System_Frontend_SRS_v1_Industry_Standard.md).

---

## Progress Dashboard

| Category | Total Tasks | Completed | In Progress | Pending | Completion Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Phase 1: API Client & Query Layer** | 4 | 4 | 0 | 0 | 100% |
| **Phase 2: Customer Portal Layout & Hub** | 3 | 3 | 0 | 0 | 100% |
| **Phase 3: Order History & Tracking Stepper** | 5 | 5 | 0 | 0 | 100% |
| **Phase 4: Saved Address Book Manager** | 4 | 4 | 0 | 0 | 100% |
| **Phase 5: Profile & Verified Account Linking** | 3 | 3 | 0 | 0 | 100% |
| **Phase 6: AI Support Concierge Widget** | 4 | 4 | 0 | 0 | 100% |
| **Phase 7: End-to-End Verification & Tests** | 3 | 3 | 0 | 0 | 100% |
| **Total** | **26** | **26** | **0** | **0** | **100%** |

```
Progress: [====================] 100% (26 / 26 tasks completed)
```

---

## Phase 1: API Client & Query Layer

> Status: **Complete**
> Target directory: `src/features/customers/`, `src/features/support-rag/`

- [x] **Task 1.1**: Update `src/features/customers/types.ts`:
  - Defined `CustomerProfile`, `CustomerStats`, `CustomerAddressItem`, `AccountLinkPayload`, `UpdateMyProfilePayload`, `CancelOrderPayload`.
- [x] **Task 1.2**: Implement customer self-service API client functions in `src/features/customers/api.ts`:
  - `getMyProfile()`, `updateMyProfile()`, `linkCustomerAccount()`
  - `listMyAddresses()`, `createMyAddress()`, `updateMyAddress()`, `deleteMyAddress()`
  - `customerCancelOrder()`
- [x] **Task 1.3**: Add TanStack React Query hooks in `src/features/customers/queries.ts`:
  - `useMyProfileQuery()`, `useUpdateMyProfileMutation()`, `useLinkAccountMutation()`
  - `useMyAddressesQuery()`, `useCreateMyAddressMutation()`, `useUpdateMyAddressMutation()`, `useDeleteMyAddressMutation()`
  - `useCustomerCancelOrderMutation()`, `useCustomerSelfServicePermissions()`
- [x] **Task 1.4**: Create `src/features/support-rag/` feature slice:
  - `api.ts`, `queries.ts`, `types.ts` for `/api/v1/support/chat` and `/api/v1/support/faq`.

---

## Phase 2: Customer Portal Layout & Hub

> Status: **Complete**
> Target directory: `src/app/(app)/portal/`

- [x] **Task 2.1**: Update navigation structure in `src/components/shared/nav-config.ts` with `"portal"` section (Dashboard, Orders, Addresses, Support, Profile) gated by customer self-service permissions.
- [x] **Task 2.2**: Implement `portal-dashboard-view.tsx` with greeting header, order count statistics cards, and quick self-service actions.
- [x] **Task 2.3**: Implement active order summary card with live status badge, ETA promise window, and "Track Package" CTA.

---

## Phase 3: Order History & Tracking Stepper

> Status: **Complete**
> Target directory: `src/app/(app)/portal/orders/`

- [x] **Task 3.1**: Implement customer orders list view (`customer-orders-view.tsx`) with status filter tabs (`All`, `Active`, `Delivered`, `Cancelled`), search input, and card layout.
- [x] **Task 3.2**: Implement 7-step visual order tracking stepper (`customer-order-tracker.tsx`):
  - `Pending` &rarr; `ReadyForPickup` &rarr; `Assigned` &rarr; `PickedUp` &rarr; `InTransit` &rarr; `OutForDelivery` &rarr; `Delivered`.
- [x] **Task 3.3**: Implement delivery exception alert card for `Failed` attempts with failure reason code and courier notes.
- [x] **Task 3.4**: Implement Proof of Delivery (POD) display card (photo preview with signed URL, recipient name, delivered timestamp).
- [x] **Task 3.5**: Implement customer cancellation modal with reason selection for `Pending` and `ReadyForPickup` orders with idempotent dispatch (`ORD-009`).

---

## Phase 4: Saved Address Book Manager

> Status: **Complete**
> Target directory: `src/app/(app)/portal/addresses/`

- [x] **Task 4.1**: Implement saved address grid (`customer-addresses-view.tsx`) with default address badge and quick action buttons.
- [x] **Task 4.2**: Implement add new saved delivery address modal with form validation (street, unit, city, postal code, gate instructions).
- [x] **Task 4.3**: Implement address editing dialog with "Set as Default" toggle.
- [x] **Task 4.4**: Implement address deletion confirmation dialog with mutation and toast feedback (soft-delete compliance).

---

## Phase 5: Profile & Verified Account Linking

> Status: **Complete**
> Target directory: `src/app/(app)/portal/profile/`

- [x] **Task 5.1**: Implement profile overview card (Name, Email, Phone, Active Customer badge).
- [x] **Task 5.2**: Implement profile update form (`customer-profile-view.tsx`) with instant feedback.
- [x] **Task 5.3**: Implement verified account linking card (`CUS-005`):
  - Allows linking historical guest checkout orders to the user account by matching verified email.

---

## Phase 6: AI Support Concierge Widget

> Status: **Complete**
> Target directory: `src/features/support-rag/components/`

- [x] **Task 6.1**: Implement floating AI launcher button (`customer-support-chat-widget.tsx`) with notification badge and interactive chat popover.
- [x] **Task 6.2**: Implement conversational chat window with multi-turn message history, typing indicator, and policy-grounded responses.
- [x] **Task 6.3**: Implement contextual suggested action pills (`Track Order`, `Cancel Order`, `Reschedule Window`, `Contact Agent`).
- [x] **Task 6.4**: Connect widget to `useSupportChatMutation()` with grounded `orderId` parameter when chatting on an order tracking page.
- [x] **Task 6.5**: Implement full knowledge base FAQ browser (`customer-support-view.tsx`) with category tabs, search input, and SLA contact banner at `/portal/support`.

---

## Phase 7: End-to-End Verification & Tests

> Status: **Complete**

- [x] **Task 7.1**: Run TypeScript typechecking (`npm run typecheck` &rarr; 0 errors).
- [x] **Task 7.2**: Run ESLint on customer and support-rag modules (`npx eslint` &rarr; 0 errors, 0 warnings).
- [x] **Task 7.3**: Build verification (`npm run build` &rarr; 31/31 routes successfully optimized, `/portal/*` static/dynamic routes ready for production).
