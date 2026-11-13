# Implementation log and verification status

## Steps

1. **Foundation** – Next.js 16 scaffold (App Router, TypeScript strict, Tailwind 4), Drizzle schema
   for all eight tables, lazy env validation, small `pg` pool.
2. **Security** – scrypt verifiers, signed session cookie (player / time-limited admin elevation),
   `proxy.ts`, guards in the data access layer and in every server action, PostgreSQL login
   throttling, security and no-store headers.
3. **Business logic** – pure rotation module, transactional day advance with row locks and an
   expected-day check, manual rotation, interval change, list/entry ordering, audit events, JSON export.
4. **Admin UI** – dashboard, campaigns, theme editor with live preview, in-game time with rotation
   preview and log, shops with inventory lists and entries, item library with search.
5. **Player UI** – login, campaign overview, dashboard, shop list and shop detail with search/filter,
   tools placeholder, two layout presets, per-campaign theme, auto-refresh (45–60 s while visible,
   plus on focus).
6. **Polish** – seed data, original SVG assets, empty/error/loading states, confirmations.
7. **Handoff** – README, `.env.example`, migrations.

## Checks run in the development environment

| Check | Result |
| --- | --- |
| `npm run typecheck` | passes |
| `npm run lint` | passes, no warnings |
| `npm test` without database | 38 passed, 24 skipped (integration suites) |
| `npm test` with `TEST_DATABASE_URL` (local PostgreSQL 16) | 62 passed |
| `npm run build` | succeeds without any secrets set |
| `npm run db:migrate`, `npm run db:seed` (twice, and `--reset`) on local PostgreSQL 16 | succeed; second seed run skips existing campaigns |
| Browser run against `next start` + local PostgreSQL (Chromium, desktop 1280 px and mobile 390 px) | passes, no console errors |

The browser run covered: redirect to login when logged out, wrong and correct group password,
hidden shop and admin entry points not visible to players, player blocked from `/admin` and from the
export API (403), admin login, +1 day (no rotation) and +9 days (4 shops rotated, matching the
expected schedule), manual rotation, creating a list, rejected invalid price with inputs kept,
creating an item, theme page, creating and deleting a campaign with confirmation, JSON export,
leaving admin mode, logout, no horizontal overflow on mobile.

Mandatory rotation cases from the spec are covered in `tests/unit/rotation.test.ts` (pure logic)
and `tests/integration/rotation-db.test.ts` (database, including 8 simultaneous day advances and
a simulated mid-transaction failure).

## Not verified here – to be checked by the project owner after setup

These need real Neon credentials / a Vercel deployment, which were deliberately not created:

- [ ] `npm run db:migrate` against Neon (direct connection string).
- [ ] App against Neon's **pooled** connection string: login, day advance, manual rotation.
      (Transactions and row locks were tested on local PostgreSQL only, not through Neon's PgBouncer.)
- [ ] Deployment on Vercel: environment variables set, cookies `Secure` over HTTPS, login throttling
      using the client IP from `x-forwarded-for`.
- [ ] Cold-start behaviour when Neon compute is suspended.
- [ ] Response headers on the deployed site (`Cache-Control: private, no-store`, `X-Robots-Tag`).

## Known limitations (by design for the MVP)

- No correction/reset of the day counter (forward only).
- No JSON import, no image upload, no player accounts, no cart/purchases.
- shadcn/ui components were written by hand in the shadcn style (`src/components/ui`), because the
  shadcn registry was not reachable from the build environment; `components.json` is included so
  `npx shadcn add …` can be used later.
- Next.js Cache Components are enabled (framework default); no protected data uses `use cache`.
