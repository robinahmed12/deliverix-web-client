import { test, expect } from "@playwright/test";
import {
  ADMIN,
  API_BASE,
  DELIVERY_ADDRESS,
  PICKUP_ADDRESS,
  TINY_PNG,
  call,
  data,
  expectApiError,
  login,
  newSession,
  provisionedDriver,
  unique,
  uniquePhone,
} from "./lib/api";

/**
 * Full delivery lifecycle against the real backend, using two real accounts:
 *
 *   admin    -> dispatcher: creates the order, readies it, offers the assignment
 *   driver   -> courier: accepts, picks up, transits, delivers with proof
 *
 * Pending -> ReadyForPickup -> Assigned -> PickedUp -> InTransit ->
 * OutForDelivery -> Delivered
 *
 * The driver is provisioned in global-setup because a driver profile is stuck
 * in `OnDelivery` after a delivery completes, and one profile is allowed per
 * account. See e2e/provision-driver.ts.
 */
test.describe.configure({ mode: "serial" });

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  version: number;
}
interface Assignment {
  id: string;
  status: string;
}
interface HistoryRow {
  fromStatus: string;
  toStatus: string;
  reasonCode: string;
  version: number;
}

test.describe("order lifecycle", () => {
  test("happy path: create -> ready -> assign -> deliver", async ({ request, browser }) => {
    // Independent cookie jars: one session per actor.
    const dispatcher = await newSession();
    const courier = await newSession();

    await login(dispatcher, ADMIN.email, ADMIN.password);
    const driver = provisionedDriver();
    await login(courier, driver.email, driver.password);

    // ---- reference data (dispatcher) ------------------------------------
    const customer = data<{ id: string }>(
      await call(dispatcher, "post", "/api/v1/customers", {
        data: {
          name: unique("E2E Customer"),
          email: `${unique("e2e")}@example.test`,
          phone: uniquePhone(),
        },
      }),
    );
    const zone = data<{ id: string }>(
      await call(dispatcher, "post", "/api/v1/zones", {
        data: { name: unique("E2E Zone"), code: unique("ZN").slice(0, 28) },
      }),
    );
    const serviceType = data<{ id: string }>(
      await call(dispatcher, "post", "/api/v1/service-types", {
        data: { name: unique("E2E Service"), code: unique("SV").slice(0, 28) },
      }),
    );
    const driverProfile = data<{ id: string; state: string }>(
      await call(courier, "get", "/api/v1/drivers/me"),
    );
    expect(
      driverProfile.state,
      "the provisioned driver starts Available",
    ).toBe("Available");

    // ---- 1. create -> Pending -------------------------------------------
    const order = data<Order>(
      await call(dispatcher, "post", "/api/v1/orders", {
        data: {
          customerId: customer.id,
          zoneId: zone.id,
          serviceTypeId: serviceType.id,
          pickupAddress: PICKUP_ADDRESS,
          deliveryAddress: DELIVERY_ADDRESS,
          items: [{ name: "E2E parcel", quantity: 1, weight: 1.5, weightUnit: "kg" }],
        },
      }),
    );
    expect(order.status, "a newly created order starts as Pending").toBe("Pending");
    expect(order.orderNumber).toMatch(/^ORD/);

    // ---- 2. ready -> ReadyForPickup -------------------------------------
    const readied = data<Order>(
      await call(dispatcher, "post", `/api/v1/orders/${order.id}/ready`),
    );
    expect(readied.status).toBe("ReadyForPickup");

    // ---- 3. offer --------------------------------------------------------
    const assignment = data<Assignment>(
      await call(dispatcher, "post", `/api/v1/orders/${order.id}/assignments`, {
        data: { driverId: driverProfile.id },
      }),
    );
    expect(assignment.status, "an assignment is created as an offer").toBe("Offered");

    // The dispatcher cannot accept on the driver's behalf.
    await expectApiError(
      await dispatcher.post(
        `${API_BASE}/api/v1/assignments/${assignment.id}/accept`,
      ),
      403,
      "FORBIDDEN",
      "dispatcher accepting on the driver's behalf",
    );

    // ---- 4. accept -> Assigned ------------------------------------------
    const accepted = data<Assignment>(
      await call(courier, "post", `/api/v1/assignments/${assignment.id}/accept`),
    );
    expect(accepted.status).toBe("Accepted");
    expect(
      data<Order>(await call(dispatcher, "get", `/api/v1/orders/${order.id}`)).status,
      "the order becomes Assigned once the offer is accepted",
    ).toBe("Assigned");

    // ---- 5..7. pickup -> in-transit -> out-for-delivery ------------------
    expect(
      data<Order>(await call(courier, "post", `/api/v1/orders/${order.id}/pickup`, { data: {} }))
        .status,
    ).toBe("PickedUp");
    expect(
      data<Order>(
        await call(courier, "post", `/api/v1/orders/${order.id}/in-transit`, { data: {} }),
      ).status,
    ).toBe("InTransit");
    expect(
      data<Order>(
        await call(courier, "post", `/api/v1/orders/${order.id}/out-for-delivery`, { data: {} }),
      ).status,
    ).toBe("OutForDelivery");

    // Delivery is only valid while proof exists; without it the attempt fails.
    const beforeProof = data<Order>(
      await call(dispatcher, "get", `/api/v1/orders/${order.id}`),
    );
    await expectApiError(
      await courier.post(`${API_BASE}/api/v1/orders/${order.id}/deliver`, {
        headers: { "If-Match": String(beforeProof.version) },
        data: {},
      }),
      422,
      "PROOF_REQUIRED",
      "delivering without proof of delivery",
    );

    // ---- 8. proof of delivery --------------------------------------------
    // The default policy requires a recipient name plus at least one photo
    // whose FileObject an operator has marked Accepted.
    const file = data<{ id: string }>(
      await call(courier, "post", "/api/v1/files/upload", {
        multipart: {
          file: { name: "proof.png", mimeType: "image/png", buffer: TINY_PNG },
          orderId: order.id,
        },
      }),
    );
    await call(dispatcher, "post", `/api/v1/files/${file.id}/scan-result`, {
      data: { status: "Accepted" },
    });

    await call(courier, "post", `/api/v1/orders/${order.id}/proofs`, {
      data: { evidenceType: "RecipientName", evidenceValue: "Test Receiver" },
    });
    await call(courier, "post", `/api/v1/orders/${order.id}/proofs`, {
      data: { evidenceType: "Photo", fileIds: [file.id] },
    });

    // ---- 9. deliver -------------------------------------------------------
    const beforeDeliver = data<Order>(
      await call(dispatcher, "get", `/api/v1/orders/${order.id}`),
    );
    const delivered = data<Order>(
      await call(courier, "post", `/api/v1/orders/${order.id}/deliver`, {
        data: {},
        headers: { "If-Match": String(beforeDeliver.version) },
      }),
    );
    expect(delivered.status, "the order reaches Delivered once proof is accepted").toBe(
      "Delivered",
    );

    // ---- 10. the full trail is recorded ----------------------------------
    const history = data<HistoryRow[]>(
      await call(dispatcher, "get", `/api/v1/orders/${order.id}/history`),
    );
    expect(
      history.map((e) => e.toStatus),
      "every lifecycle transition is recorded in order",
    ).toEqual([
      "Pending",
      "ReadyForPickup",
      "Assigned",
      "PickedUp",
      "InTransit",
      "OutForDelivery",
      "Delivered",
    ]);

    // The assignment is closed out.
    const assignmentHistory = data<{ status: string }[]>(
      await call(dispatcher, "get", `/api/v1/dispatch/orders/${order.id}/assignments`),
    );
    expect(assignmentHistory[0]?.status).toBe("Completed");

    // Bug 1 regression: the driver must be returned to the pool. A driver left
    // in `OnDelivery` is ineligible for every future offer, because
    // `checkDriverEligibility` requires `Available` — one delivery per driver,
    // per account, ever.
    const me = data<{ state: string }>(await call(courier, "get", "/api/v1/drivers/me"));
    expect(me.state, "the driver is released once the delivery completes").toBe("Available");

    const availability = data<{ state: string }>(
      await call(courier, "put", "/api/v1/drivers/me/availability", {
        data: { state: "Unavailable" },
      }),
    );
    expect(availability.state).toBe("Unavailable");
    await call(courier, "put", "/api/v1/drivers/me/availability", {
      data: { state: "Available" },
    });

    // ...which means they can actually be offered another order.
    const second = data<{ id: string; status: string; version: number }>(
      await call(dispatcher, "post", "/api/v1/orders", {
        data: {
          customerId: customer.id,
          pickupAddress: PICKUP_ADDRESS,
          deliveryAddress: DELIVERY_ADDRESS,
          items: [{ name: "Second parcel", quantity: 1 }],
        },
      }),
    );
    await call(dispatcher, "post", `/api/v1/orders/${second.id}/ready`, { data: {} });
    const secondOffer = data<{ id: string; status: string }>(
      await call(dispatcher, "post", `/api/v1/orders/${second.id}/assignments`, {
        data: { driverId: driverProfile.id },
      }),
    );
    expect(
      secondOffer.status,
      "the same driver can be offered a second order after delivering the first",
    ).toBe("Offered");

    // Bug 3 regression: every history row must carry the order version that the
    // transition produced. `ASSIGNMENT_ACCEPTED` used to hardcode version 1.
    const versions = history.map((e) => e.version);
    expect(
      versions,
      "history versions increase monotonically and match the order's own version",
    ).toEqual([...versions].sort((a, b) => a - b));
    expect(new Set(versions).size, "no history row reuses a version").toBe(versions.length);
    const assignedRow = history.find((e) => e.toStatus === "Assigned");
    expect(
      assignedRow?.version,
      "the assignment row is not stuck at version 1",
    ).toBeGreaterThan(1);

    void browser;
    await dispatcher.dispose();
    await courier.dispose();
  });

  test("state machine rejects illegal transitions", async ({ request }) => {
    const dispatcher = await newSession();
    await login(dispatcher, ADMIN.email, ADMIN.password);

    const customer = data<{ id: string }>(
      await call(dispatcher, "post", "/api/v1/customers", {
        data: {
          name: unique("E2E Guards"),
          email: `${unique("g")}@example.test`,
          phone: uniquePhone(),
        },
      }),
    );
    // The driver is the one provisioned in global-setup, not the admin: a driver
    // profile is bound to a single account, so the admin is not guaranteed to
    // have one.
    const courier = await newSession();
    const creds = provisionedDriver();
    await login(courier, creds.email, creds.password);
    const driverProfile = data<{ id: string }>(await call(courier, "get", "/api/v1/drivers/me"));

    const order = data<Order>(
      await call(dispatcher, "post", "/api/v1/orders", {
        data: {
          customerId: customer.id,
          pickupAddress: PICKUP_ADDRESS,
          deliveryAddress: DELIVERY_ADDRESS,
          items: [{ name: "Guard parcel", quantity: 1 }],
        },
      }),
    );

    // A Pending order cannot be picked up.
    await expectApiError(
      await dispatcher.post(`${API_BASE}/api/v1/orders/${order.id}/pickup`, { data: {} }),
      409,
      "ORDER_STATE_CONFLICT",
      "picking up a Pending order",
    );

    // A Pending order cannot receive an assignment offer.
    await expectApiError(
      await dispatcher.post(`${API_BASE}/api/v1/orders/${order.id}/assignments`, {
        data: { driverId: driverProfile.id },
      }),
      409,
      "ORDER_STATE_CONFLICT",
      "assigning a Pending order",
    );

    // reschedule is behind requireVersion, so the header must be present.
    await expectApiError(
      await dispatcher.post(`${API_BASE}/api/v1/orders/${order.id}/reschedule`, {
        data: {
          rescheduledAtStart: new Date(Date.now() + 86_400_000).toISOString(),
          rescheduledAtEnd: new Date(Date.now() + 90_000_000).toISOString(),
          reasonCode: "E2E",
        },
      }),
      428,
      "PRECONDITION_REQUIRED",
      "rescheduling without a version header",
    );

    // Optimistic locking on the PATCH route.
    const current = data<{ version: number }>(
      await call(dispatcher, "get", `/api/v1/orders/${order.id}`),
    );
    await expectApiError(
      await dispatcher.patch(`${API_BASE}/api/v1/orders/${order.id}`, {
        headers: { "If-Match": String(current.version + 99) },
        data: { packageNote: "stale write" },
      }),
      412,
      "RESOURCE_VERSION_MISMATCH",
      "patching with a stale version",
    );

    // Optimistic locking on the delivery action routes, which used to accept a
    // stale If-Match and silently land the write.
    await expectApiError(
      await dispatcher.post(`${API_BASE}/api/v1/orders/${order.id}/reschedule`, {
        headers: { "If-Match": "999" },
        data: {
          rescheduledAtStart: new Date(Date.now() + 86_400_000).toISOString(),
          rescheduledAtEnd: new Date(Date.now() + 90_000_000).toISOString(),
          reasonCode: "E2E_STALE",
        },
      }),
      412,
      "RESOURCE_VERSION_MISMATCH",
      "rescheduling with a stale If-Match",
    );

    // ...and the rejected write must not have landed.
    const afterStale = data<{ version: number; rescheduledAtStart: string | null }>(
      await call(dispatcher, "get", `/api/v1/orders/${order.id}`),
    );
    expect(
      afterStale.version,
      "the rejected stale write did not bump the order version",
    ).toBe(current.version);
    expect(
      afterStale.rescheduledAtStart ?? null,
      "the rejected stale write did not change the reschedule window",
    ).toBeNull();

    // The same lock applies to every other endpoint behind requireVersion.
    for (const [path, body] of [
      ["/return", { reasonCode: "E2E_STALE" }],
      ["/confirm-return", {}],
      ["/confirm-pickup-receipt", { reasonCode: "E2E_STALE" }],
      ["/deliver", {}],
    ] as const) {
      await expectApiError(
        await dispatcher.post(`${API_BASE}/api/v1/orders/${order.id}${path}`, {
          headers: { "If-Match": "999" },
          data: body,
        }),
        412,
        "RESOURCE_VERSION_MISMATCH",
        `POST ${path} with a stale If-Match`,
      );
    }

    // An unknown id is a 404, not a 500.
    await expectApiError(
      await dispatcher.get(`${API_BASE}/api/v1/orders/cmdoesnotexist0000000000`),
      404,
      "RESOURCE_NOT_FOUND",
      "fetching a nonexistent order",
    );

    await dispatcher.dispose();
    await courier.dispose();
  });

  test("unauthenticated requests are rejected", async ({ request }) => {
    await expectApiError(
      await request.get(`${API_BASE}/api/v1/orders`),
      401,
      "AUTH_INVALID_CREDENTIALS",
      "listing orders without a session",
    );
  });
});
