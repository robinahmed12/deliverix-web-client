/**
 * Provisions a fresh, isolated driver account for one E2E run and writes the
 * credentials to `e2e/.e2e-driver.json`.
 *
 * Why this exists: a driver profile gets stuck in the `OnDelivery` state after a
 * delivery completes (see the bug report), and one profile is allowed per
 * account. Provisioning a brand-new account per run keeps the suite repeatable
 * without depending on that broken state transition.
 *
 * Needs direct database access because `POST /api/v1/users` only creates
 * `Invited` accounts that must complete the SMTP-backed invitation flow to set a
 * password. Run via the backend's tsx so the Prisma client and argon2 resolve:
 *
 *   npx tsx e2e/provision-driver.ts
 *
 * Override the backend location with DELIVERIX_BACKEND_DIR.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Minimal shape of the generated Prisma client that this script relies on. */
interface PrismaLike {
  role: { findUnique(o: unknown): Promise<{ id: string } | null> };
  user: { create(o: unknown): Promise<{ id: string }> };
  driver: { create(o: unknown): Promise<{ id: string }> };
  vehicle: { create(o: unknown): Promise<{ id: string }> };
  driverVehicleAssignment: { create(o: unknown): Promise<unknown> };
  $disconnect(): Promise<void>;
}

const BACKEND_DIR = process.env.DELIVERIX_BACKEND_DIR ?? "E:/project_/deliverix-beckend";

/** ESM dynamic import requires a file:// URL for absolute Windows paths. */
const load = (relativePath: string) =>
  import(pathToFileURL(resolve(BACKEND_DIR, relativePath)).href);

async function main() {
  // Imported dynamically so the paths can be built from BACKEND_DIR, and so a
  // missing backend produces a clear message rather than a module-not-found.
  const dotenv = (await load("node_modules/dotenv/lib/main.js")) as {
    config(o: { path: string }): unknown;
  };
  // cwd is the frontend repo, so the backend's .env must be loaded by path.
  dotenv.config({ path: resolve(BACKEND_DIR, ".env") });
  if (!process.env.DATABASE_URL) {
    throw new Error(`DATABASE_URL not found in ${resolve(BACKEND_DIR, ".env")}`);
  }

  const { PrismaPg } = (await load("node_modules/@prisma/adapter-pg/dist/index.js")) as {
    PrismaPg: new (opts: { connectionString: string }) => unknown;
  };
  const { PrismaClient } = (await load("src/generated/prisma/client.js")) as {
    PrismaClient: new (opts: unknown) => PrismaLike;
  };
  const argon2 = (await load("node_modules/argon2/argon2.cjs")) as {
    default?: { hash: (p: string, o: unknown) => Promise<string> };
    hash: (p: string, o: unknown) => Promise<string>;
  };
  const hashPassword = argon2.default?.hash ?? argon2.hash;

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
  });

  try {
    const stamp = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
    const email = `e2e.driver.${stamp}@deliverix.local`;
    const password = "Deliverix-E2E-Driver-1";

    const driverRole = await prisma.role.findUnique({ where: { name: "driver" } });
    if (!driverRole) throw new Error('Role "driver" missing — run the backend seed');

    const passwordHash = await hashPassword(password, {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: "E2E Driver",
        status: "Active",
        roles: { create: { roleId: driverRole.id } },
      },
    });

    const driver = await prisma.driver.create({
      data: {
        accountId: user.id,
        contactPhone: `+8801${stamp.slice(-9).padStart(9, "0")}`,
        driverCode: `E2E${stamp.slice(-8)}`,
        qualification: "E2E",
        active: true,
        state: "Available",
      },
    });

    const vehicle = await prisma.vehicle.create({
      data: {
        registrationNumber: `E2E${stamp.slice(-8)}`,
        vehicleType: "Van",
        capacityValue: 50,
        capacityUnit: "kg",
        status: "Active",
      },
    });
    await prisma.driverVehicleAssignment.create({
      data: { driverId: driver.id, vehicleId: vehicle.id, reasonCode: "E2E_PROVISION" },
    });

    const out = {
      email,
      password,
      userId: user.id,
      driverId: driver.id,
      vehicleId: vehicle.id,
    };
    writeFileSync(
      resolve(process.cwd(), "e2e/.e2e-driver.json"),
      JSON.stringify(out, null, 2),
    );
    console.log(`PROVISIONED ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
