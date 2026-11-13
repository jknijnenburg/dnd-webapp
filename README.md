# D&D Campaign Hub (Kampagnen-Hub)

A private merchant and item hub for tabletop campaigns. Players enter with **one shared group
password** and browse the shops of each campaign; one **admin** manages campaigns, shops, rotating
inventory lists, items, themes and the **in-game day** of every campaign.

The user interface is German; code, comments and this documentation are English.

- Next.js 16 (App Router, Server Components, Server Actions, `proxy.ts`), TypeScript `strict`
- Tailwind CSS 4, shadcn-style UI components (Radix), Lucide icons
- Neon PostgreSQL via Drizzle ORM + Drizzle Kit, `pg` driver with a small pool
- Custom scrypt password verification, signed session cookies, PostgreSQL-backed login throttling
- Zod validation, Vitest tests
- Target hosting: Vercel Hobby. No cron jobs, no paid services, no uploads.

> **Responsibilities.** The code, schema, migrations, seed data and tests are in this repository.
> Creating the Neon project, setting secrets in Vercel and deploying are done by **you, the project
> owner** (sections 3 and 8). Nothing in this repository creates external resources.

---

## 1. Prerequisites and installation

- Node.js **22.12 or newer**, npm
- A PostgreSQL **15+** database (Neon in production; any local PostgreSQL for development)

```bash
npm install
```

## 2. Generate password hashes and the session secret

Passwords are never stored in plaintext. Create one verifier for the group password and one for the
admin password (input is not echoed, minimum 8 characters; use a long, different admin password):

```bash
npm run hash-password
```

```bash
npm run generate-secret
```

The first command prints a value starting with `scrypt:` for `PLAYER_PASSWORD_HASH` /
`ADMIN_PASSWORD_HASH`; the second prints a value for `SESSION_SECRET`.
Changing `SESSION_SECRET` logs everybody out. Changing a password = generating a new hash and
replacing the variable (then redeploy on Vercel).

## 3. Create the Neon database (project owner)

1. Sign in at <https://neon.tech> and create a project (free plan, PostgreSQL 16 or 17, a region
   close to your Vercel region, e.g. Frankfurt).
2. In the dashboard open **Connect** and copy two connection strings:
   - **Pooled** (host contains `-pooler`) → `DATABASE_URL` (used by the app)
   - **Direct** (pooling switched off) → `DATABASE_URL_UNPOOLED` (optional, used only for migrations)
3. Keep these strings secret; they contain the database password.

Neon's Vercel integration may be used instead – it sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED`
with exactly these names.

## 4. Configure `.env.local`

```bash
cp .env.example .env.local
```

Fill in `DATABASE_URL`, `PLAYER_PASSWORD_HASH`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`
(and optionally `DATABASE_URL_UNPOOLED`). `.env.local` is git-ignored – never commit it.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string (Neon: pooled) |
| `PLAYER_PASSWORD_HASH` | yes | scrypt verifier of the shared group password |
| `ADMIN_PASSWORD_HASH` | yes | scrypt verifier of the admin password |
| `SESSION_SECRET` | yes | ≥ 32 characters, signs session cookies and hashes client IPs |
| `DATABASE_URL_UNPOOLED` | no | direct connection for `npm run db:migrate` |
| `TEST_DATABASE_URL` | no | disposable database for integration tests (tables get truncated!) |

## 5. Run the migrations

```bash
npm run db:migrate
```

Applies everything in `drizzle/` (`0000_init.sql` plus `0001_constraints.sql`, which adds
constraints Drizzle cannot express: the composite foreign key for the active list and deferrable
unique positions). After changing `src/lib/db/schema.ts`, create a new migration with
`npm run db:generate` and commit it.

## 6. Optional: sample data

```bash
npm run db:seed
```

Creates two sample campaigns ("Asche & Gold", "Gezeiten von Marrow") with different themes, day
counters, shops, inventory lists and items. It only runs when invoked, never sets passwords, and
skips a sample campaign that already exists. To delete and recreate **only** the two sample campaigns:

```bash
npm run db:seed -- --reset
```

## 7. Develop, test, build

```bash
npm run dev
```

Open <http://localhost:3000>, enter the group password, then open **Spielleitung** (footer) or
`/admin` and enter the admin password.

**Create a first campaign:** `/admin` → *Neue Kampagne* → name, slug, start day → *Kampagne
anlegen*. Then *Händler* → *Neuer Händler* (set the interval), add inventory lists on the shop page,
create items under *Gegenstände* and add them to the lists. Advance days under *Spielzeit*.

```bash
npm run check
```

runs type check, ESLint and the tests. Individual commands: `npm run typecheck`, `npm run lint`,
`npm test`, `npm run build`.

**Integration tests** (rotation atomicity, concurrency, schema invariants, rate limiting) need a real,
disposable PostgreSQL database and are *skipped* without it:

```bash
TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/hub_test" npm test
```

Never point `TEST_DATABASE_URL` at a database with real data – the tests truncate all tables.

## 8. Deploy to Vercel (project owner)

1. Push this repository to GitHub/GitLab/Bitbucket (private repository recommended).
2. Vercel → **Add New… → Project** → import the repository. Framework preset: Next.js, default
   build settings.
3. **Settings → Environment Variables** (Production, and Preview if you use it): `DATABASE_URL`,
   `PLAYER_PASSWORD_HASH`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` (optionally
   `DATABASE_URL_UNPOOLED`). Mark them *Sensitive*. Do not create any `NEXT_PUBLIC_` variable.
4. **Run migrations before the new code goes live.** Recommended, explicit procedure: with the Neon
   connection strings in your local `.env.local`, run `npm run db:migrate`, then deploy.
   Write migrations backwards-compatible (add columns/tables first, remove old ones in a later
   release) so the currently running version keeps working during the rollout.
   Alternative: set the Vercel build command to `npm run db:migrate && npm run build` – simpler, but
   a failed build can then leave the database ahead of the running code.
5. Deploy, then test: without login every URL redirects to `/login`; group login works; `/admin`
   asks for the admin password; create a campaign; advance a day; open the site on a phone.
6. Functions should run in a region near the database (Settings → Functions → Region).

### Limits, backups, export

- **Vercel Hobby**: personal, non-commercial use; functions are short-lived and stateless. The app
  uses no cron jobs, no background work and no file system writes.
- **Neon Free**: limited storage and compute hours; compute suspends when idle, so the first request
  after a pause takes a second or two longer. The app keeps at most 5 connections per function
  instance and should use the pooled connection string.
- **Backups**: Neon keeps a short point-in-time history on the free plan – do not rely on it alone.
  For a full backup run `pg_dump "$DATABASE_URL_UNPOOLED" > backup.sql` regularly (restore with
  `psql`). Store dumps securely; they contain all campaign data.
- **JSON export**: *Verwaltung → Kampagnen → [Kampagne] → JSON-Export herunterladen* downloads one
  campaign (theme, shops, lists, items) as a JSON file – a readable snapshot before big changes.
  There is no JSON import in the MVP.

## 9. How it works

### In-game time and rotation

- Only the admin advances days (`/admin` quick buttons or *Spielzeit*). Nothing depends on real
  time, page views, timers or cron.
- Each shop has `refreshIntervalDays`, `nextRefreshDay` and ordered inventory lists. On a jump to
  `newDay`: `rotationsDue = newDay < nextRefreshDay ? 0 : floor((newDay − nextRefreshDay) / interval) + 1`,
  the active list moves `rotationsDue` steps (modulo list count) and `nextRefreshDay` advances by
  `rotationsDue × interval`. Pure logic: `src/features/ingame-time/rotation.ts`.
- Day counter, all shop updates and audit events are written in **one transaction** holding a row
  lock on the campaign. Each request carries the day the admin saw; if the campaign has moved on
  (double click, retry, second tab) the request is rejected instead of applied twice.
- Manual rotation moves exactly one list forward and does **not** change `nextRefreshDay`.
- Changing a shop's interval reschedules the next refresh to `currentDay + interval`.
- Deleting/reordering lists keeps the active list where possible; if the active list is deleted the
  following one takes over.

### Security model

- `src/proxy.ts` redirects visitors without a session – but it is only the first layer. Every data
  access function (`src/lib/dal/*`), every server action (`runAdminAction`) and the export route
  re-verify the session; `tests/unit/guards.test.ts` checks this without the proxy.
- Session: HMAC-SHA256 signed cookie, `HttpOnly`, `SameSite=Lax`, `Secure` in production. Player
  access lasts 14 days, admin elevation 8 hours; the admin login requires a player session first.
- Login throttling in PostgreSQL (`login_attempts`): 5 failures per client and login type in
  15 minutes, plus a global cap; only an HMAC of the IP is stored; rows are deleted after 24 hours.
- CSRF: all mutations are Server Actions (POST only, Next.js rejects foreign `Origin`s) and the
  cookie is `SameSite=Lax`; the only route handler is a read-only GET.
- Descriptions are rendered as plain text (React escaping, no HTML injection). Theme values are
  validated (hex colours, preset names, asset paths below `/images/`) before reaching CSS.
- Responses carry `Cache-Control: private, no-store`; protected content is rendered per request and
  never cached on the server. `noindex` headers/robots are set, but are not access control.
- Files in `public/` are reachable **without login** – only non-confidential images belong there.

### Project structure

```text
drizzle/                  SQL migrations
public/images/            original SVG placeholders (items, shops, covers, backgrounds)
scripts/                  hash-password, generate-secret, seed, asset catalog
src/app/                  routes: login, campaigns (players), admin, api/admin export
src/components/           UI primitives (ui/), forms, browsers, admin fields
src/features/             campaigns, shops, items, ingame-time (schemas, services, actions), tools registry
src/lib/                  auth, db (schema, pool), dal (guarded reads), money, theme, assets, validation
tests/unit, tests/integration
```

Adding images: put a file into `public/images/{items,shops,covers,backgrounds}/` (lowercase file
name) and run `npm run assets` (also runs before `dev`/`build`); it then appears in the admin
selects. Adding a campaign tool: see `src/features/tools/registry.ts`.

### Assumptions made

- "N nonempty inventory lists" is read as "the shop has N lists"; a list without items is a valid
  rotation step and shows an empty shop.
- Items belong to one campaign (library per campaign); list entries carry quantity and an optional
  price override.
- Besides the manual "next list" button the admin can set any list active directly; neither changes
  the schedule.
- Hidden shops still rotate on schedule.
- Day jumps are limited to 3650 days per action.

## 10. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Login says the app is not fully set up | A required variable is missing or malformed. Hashes must start with `scrypt:`, `SESSION_SECRET` needs ≥ 32 characters. On Vercel: redeploy after changing variables. |
| Login says the database is unreachable | `DATABASE_URL` wrong, Neon project paused/deleted, or migrations not applied (`login_attempts` missing). Run `npm run db:migrate`. |
| "Etwas ist schiefgelaufen" on pages | Usually the same database causes; check the Vercel function logs (only variable *names* and error messages are logged, never secrets). |
| Password is rejected | Hash generated from a different password, or copied incompletely (must be one line with 6 `:`-separated parts, quoted in `.env.local`). Generate a new one. |
| "Zu viele Fehlversuche" | Wait 15 minutes, or (admin of the database) `DELETE FROM login_attempts;`. |
| `db:migrate` fails with a connection error | Use the direct connection string in `DATABASE_URL_UNPOOLED`; check `sslmode=require`. |
| `db:migrate` fails on `0001_constraints` | PostgreSQL older than 15 – use 15 or newer. |
| Migration partly applied | Drizzle runs migrations in a transaction; fix the cause and rerun. Applied migrations are tracked in `drizzle.__drizzle_migrations`. |
| Everybody was logged out | `SESSION_SECRET` changed. |
| New image does not appear in selects | Run `npm run assets` and commit `src/lib/asset-catalog.generated.ts`. |

## Verification status

See [docs/PROGRESS.md](docs/PROGRESS.md) for what was implemented, which checks were run and what
remains to be verified after the Neon/Vercel setup.
