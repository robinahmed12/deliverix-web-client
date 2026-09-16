# Deliverix Web

Frontend application for the Deliverix Delivery Management System. Built with:

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **TanStack Query v5** for server state
- **React Hook Form + Zod** for forms
- **Tailwind CSS v4 + shadcn-style** component primitives

Backend lives in the sibling `Deliverix` repo; see the backend
`Docs/SRS.md` for system requirements.

## Development

1. Start the backend on port 4000:

   ```
   PORT=4000 npm run dev
   ```

2. Start the frontend (defaults to port 3000):

   ```
   npm run dev
   ```

The Next.js dev server proxies `/api/v1/*` to the backend
(`next.config.ts`, `BACKEND_URL` override supported).

## Verification

```
npm run typecheck
npm run lint
npm run build
```

## Deviations from SRS API-001..004

The SRS mandates an OpenAPI document generated from a single source of truth
(API-001), references to it in responses (API-002/003), and an OpenAPI-driven
client (API-004/b). This repository instead ships a **hand-written typed API
client** ([apiFetch](./src/lib/api/client.ts) + hand-written DTOs in
[types](./src/lib/api/types.ts)) for the following reasons:

- The backend `Deliverix` repo has no OpenAPI artifact yet; generating one is
  out of scope of the frontend effort.
- Hand-written types give full editor support and are the only practical
  option against the current backend contract.
- The typed client is owned by one place and updated against the backend
  route catalog when phases land.

The DTO shapes mirror the backend envelopes (`{ data, meta }`, RFC 9457
problem details for errors).

## Phase plan

| Phase | Scope | Status |
| ----- | ----- | ------ |
| 1 | Foundation: shell, auth, API/query infra | In progress |
| 2 | Orders | Planned |
| 3 | Drivers, vehicles, customers, configuration | Planned |
| 4 | Dispatch & assignment | Planned |
| 5 | Driver workflow + proof of delivery | Planned |
| 6 | Notifications, reports, audit logs | Planned |
| 7 | Hardening + E2E | Planned |

Each phase is verified with `typecheck`, `lint`, and a production build before
moving on.