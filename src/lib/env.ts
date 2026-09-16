import "server-only";

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  // Base URL of the Express backend. The Next.js rewrite proxies /api/v1 to this.
  BACKEND_URL: process.env.BACKEND_URL ?? "http://localhost:4000",
} as const;