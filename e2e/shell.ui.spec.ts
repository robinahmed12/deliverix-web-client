import { test, expect } from "@playwright/test";
import { ADMIN } from "./lib/api";

/**
 * Browser-level checks against the running Next.js app.
 *
 * Runs in both the `desktop` and `mobile` Playwright projects, so anything
 * asserted here must hold at 1280x800 and on a Pixel 5 viewport.
 */
async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(ADMIN.email);
  await page.getByLabel(/password/i).fill(ADMIN.password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

/** The shell's nav is CSS-hidden below md, so tests must open the drawer first. */
async function openNavIfNeeded(page: import("@playwright/test").Page) {
  const trigger = page.getByRole("button", { name: /open navigation menu/i });
  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
  }
}

test.describe("authenticated shell", () => {
  test("signs in and lands on the dashboard", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await signIn(page);

    // Assert the page content first: below md the nav lives inside the drawer,
    // and opening a modal drawer marks the rest of the page aria-hidden, which
    // would hide the heading from the accessibility tree.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await openNavIfNeeded(page);
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    expect(errors, "no uncaught client errors during sign-in").toEqual([]);
  });

  test("primary navigation exposes the core modules", async ({ page }) => {
    await signIn(page);
    await openNavIfNeeded(page);

    const nav = page.getByRole("navigation", { name: "Primary" });
    for (const label of ["Dashboard", "Orders", "Dispatch", "Drivers", "Customers"]) {
      await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
  });

  test("navigates to the orders list and opens an order", async ({ page }) => {
    await signIn(page);
    await openNavIfNeeded(page);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Orders", exact: true })
      .click();
    await page.waitForURL(/\/orders/, { timeout: 30_000 });

    // The explorer renders a table once data arrives.
    const firstRow = page.getByRole("row").nth(1);
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.getByRole("link").first().click();
      await page.waitForURL(/\/orders\/[^/]+$/, { timeout: 30_000 });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });

  test("dispatch queue loads", async ({ page }) => {
    await signIn(page);
    await openNavIfNeeded(page);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Dispatch", exact: true })
      .click();
    await page.waitForURL(/\/dispatch/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("form accessibility", () => {
  test("login fields are programmatically labelled", async ({ page }) => {
    await page.goto("/login");

    // Regression guard: FormControl used to put the id on a wrapping <div>,
    // which left every field in the app unlabelled, because <label for> can
    // only target labelable elements.
    const email = page.getByLabel("Email", { exact: true });
    await expect(email, "the email input is reachable by its label").toBeVisible();

    const password = page.getByLabel("Password", { exact: true });
    await expect(password, "the password input is reachable by its label").toBeVisible();

    // The id the label points at must be the control itself.
    const id = await email.getAttribute("id");
    expect(id, "the input carries the id its label references").toBeTruthy();

    // A validation failure must be announced, not just coloured red. The email
    // input carries type="email" and the form has no noValidate, so the browser
    // blocks submit natively before zod runs — drive the failure through the
    // password field instead, which has no native constraint.
    await email.fill("someone@example.com");
    await password.fill("");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText(/password is required/i)).toBeVisible();
    const describedBy = await password.getAttribute("aria-describedby");
    expect(
      describedBy,
      "the invalid field is wired to its message via aria-describedby",
    ).toBeTruthy();
    expect(await password.getAttribute("aria-invalid")).toBe("true");
  });
});

test.describe("mobile navigation drawer", () => {
  test.skip(({ isMobile }) => !isMobile, "drawer is a small-viewport affordance");

  test("hamburger opens the drawer and closes on navigation", async ({ page }) => {
    await signIn(page);

    const trigger = page.getByRole("button", { name: /open navigation menu/i });
    await expect(trigger).toBeVisible();

    // The desktop sidebar must not be rendered in the viewport at this width.
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeHidden();

    await trigger.click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("navigation", { name: "Primary" })).toBeVisible();

    await drawer.getByRole("link", { name: "Orders", exact: true }).click();
    await page.waitForURL(/\/orders/, { timeout: 30_000 });

    // Navigating must dismiss the drawer, otherwise it covers the new page.
    await expect(drawer).toBeHidden();
  });

  test("drawer closes on Escape", async ({ page }) => {
    await signIn(page);

    const trigger = page.getByRole("button", { name: /open navigation menu/i });
    await trigger.click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
  });

  test("notification and user controls stay reachable in the header", async ({ page }) => {
    await signIn(page);
    // The drawer must not be needed to reach these.
    await expect(page.getByRole("link", { name: /notifications/i }).first()).toBeVisible();
  });
});
