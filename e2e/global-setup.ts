import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const TSX = process.env.E2E_TSX ??
  "E:/project_/deliverix-beckend/node_modules/.bin/tsx.cmd";
const OUT = resolve(ROOT, "e2e/.e2e-driver.json");

/**
 * Provisions a fresh driver account per run.
 *
 * A driver gets stuck in `OnDelivery` after completing a delivery and cannot be
 * returned to `Available` (the release paths only match `state: "Assigned"`),
 * and the backend allows one driver profile per account. A new account per run
 * is what keeps this suite repeatable.
 */
export default async function globalSetup(): Promise<void> {
  if (process.env.E2E_SKIP_PROVISION === "1") {
    if (!existsSync(OUT)) {
      throw new Error("E2E_SKIP_PROVISION=1 but e2e/.e2e-driver.json is missing");
    }
    return;
  }

  mkdirSync(resolve(ROOT, "e2e"), { recursive: true });

  try {
    // `shell: true` is required because Node refuses to spawn a .cmd shim
    // directly; the paths are quoted so spaces would survive.
    execFileSync(`"${TSX}" "${resolve(ROOT, "e2e/provision-driver.ts")}"`, {
      cwd: ROOT,
      stdio: "pipe",
      shell: true,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to provision the E2E driver account. Is the backend at ` +
        `DELIVERIX_BACKEND_DIR with a migrated database?\n${detail}`,
    );
  }

  if (!existsSync(OUT)) {
    throw new Error("provision-driver.ts ran but wrote no e2e/.e2e-driver.json");
  }

  // Fail fast with a clear message if the provisioned account cannot sign in.
  const creds = JSON.parse(readFileSync(OUT, "utf8")) as { email: string; password: string };
  const base = process.env.E2E_API_BASE ?? "http://localhost:5000";
  const probe = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: creds.email, password: creds.password }),
  });

  if (probe.status !== 200) {
    const body =
      typeof probe.text === "function" ? await probe.text() : "<body unavailable>";
    throw new Error(
      `Provisioned driver ${creds.email} could not sign in: HTTP ${probe.status} ${body}`,
    );
  }

  writeFileSync(
    resolve(ROOT, "e2e/.e2e-env.json"),
    JSON.stringify({ driverEmail: creds.email, driverPassword: creds.password }, null, 2),
  );
}
