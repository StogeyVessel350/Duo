# Web

Next.js monorepo with three deployments (all behind CloudFront):

- `apps/marketing/`  → `duo.com` — marketing + store (SSR/ISR for SEO)
- `apps/dashboard/`  → `app.duo.com` — gym operator dashboard (CSR, auth-gated)
- `apps/admin/`      → `admin.duo.com` — internal operations

Shared code lives in `packages/ui` (design system) and `packages/config`.

See [`../docs/phase_3_backend_architecture.md`](../docs/phase_3_backend_architecture.md) and Phase 6 for the full design.

## Stack

- Next.js 14+ (App Router)
- TypeScript strict
- Tailwind + shadcn/ui components
- pnpm workspaces + Turborepo
- Stripe for payments, Klaviyo for lifecycle email
- TanStack Query for server state

## Setup

```bash
pnpm install
pnpm dev        # runs all apps on different ports
pnpm dev --filter=marketing
pnpm build
```
