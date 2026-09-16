import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";
    return [
      // Same-origin proxy for REST API requests.
      // Purpose: forward browser-originated /api/v1 calls to the Express backend so that
      // httpOnly cookies (access_token, refresh_token) travel same-origin without
      // requiring CORS `credentials: true` on the backend.
      // When deploying behind a common reverse proxy the rewrites can be replaced with
      // a single origin config and this block removed — document the topology change.
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
