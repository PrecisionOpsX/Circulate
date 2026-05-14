# Circulate

A local marketplace where people trade goods and services using internal
**platform credits** instead of cash. Earn credits by selling, spend them
buying — a small platform fee on every trade keeps the system healthy.

> **Status:** Milestone 1 (Foundation) complete. See
> [Milestone roadmap](#milestone-roadmap) below.

---

## Tech stack

| Area        | Choice                                       |
| ----------- | -------------------------------------------- |
| Framework   | Next.js 16 (App Router) + React 19           |
| Language    | TypeScript                                   |
| Styling     | Tailwind CSS v4                              |
| Backend/DB  | Supabase (Postgres, Auth, Storage, Realtime) |
| Auth        | Supabase Auth (email/password) + Twilio SMS  |
| Validation  | Zod                                          |
| Hosting     | Vercel                                       |

Messaging (Stream Chat), analytics (PostHog) and email (Resend) are wired
into the env config but implemented in later milestones.

---

## Getting started

### 1. Prerequisites

- Node.js 20+ and npm
- A [Supabase](https://supabase.com) project (free tier is fine)

### 2. Install

```bash
npm install
```

### 3. Configure environment

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Required values (from **Supabase dashboard → Project Settings → API**):

| Variable                        | Where to find it                     |
| ------------------------------- | ------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Project URL                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / `public` key                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | `service_role` key (**server only**)  |
| `NEXT_PUBLIC_SITE_URL`          | `http://localhost:3000` in dev        |

The app validates env vars on boot (`src/lib/env.ts`) and fails fast with a
readable error if anything required is missing.

### 4. Set up the database

**Easiest:** open the **Supabase SQL Editor**, paste the contents of
[`supabase/setup.sql`](supabase/setup.sql) (schema + RLS + seed in one file),
and run it.

Other options:

- Run the files individually in order: `supabase/migrations/0001_initial_schema.sql`,
  `supabase/migrations/0002_rls_policies.sql`, then `supabase/seed.sql`.
- Apply over a direct DB connection:
  `SUPABASE_DB_URL="postgresql://postgres:[PWD]@db.<ref>.supabase.co:5432/postgres" node scripts/migrate.mjs`
  (needs `npm install pg`).
- Supabase CLI: `supabase db reset` applies `migrations/` then `seed.sql`.

Then verify the schema + auth bootstrap trigger end-to-end:

```bash
node scripts/verify-auth.mjs
```

This creates a throwaway user, confirms the `handle_new_user()` trigger
created their profile + wallet, and cleans up.

### 5. Configure Supabase Auth

The dashboard-side setup — Auth redirect URLs, email confirmation, and
Twilio phone verification — has its own step-by-step guide:

**→ [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)**

In short: allow-list `/auth/callback` + `/auth/confirm` redirect URLs, turn
on "Confirm email", and (optionally) connect Twilio then set
`NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED=true`.

### 6. Run

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
src/
├─ app/
│  ├─ (auth)/            Login, signup, email/phone verification + auth actions
│  ├─ (app)/             Signed-in pages: dashboard, profile, settings
│  ├─ auth/              Route handlers: /auth/callback, /auth/confirm
│  ├─ about, faq, ...    Static / marketing pages
│  ├─ layout.tsx         Root layout (header + footer)
│  └─ page.tsx           Landing page
├─ components/
│  ├─ ui/                Reusable primitives (Button, Input, Field, Alert…)
│  ├─ layout/            Header, Footer, nav
│  └─ account/           Verification badges, phone verification
├─ lib/
│  ├─ env.ts             Zod-validated environment variables
│  ├─ constants.ts       Business rules (credit floor, fee rate…)
│  ├─ validation.ts      Zod form schemas
│  ├─ auth.ts            getSessionUser / requireUser / requireAdmin
│  └─ supabase/          Browser / server / admin clients + proxy helper + types
└─ proxy.ts              Session refresh + route protection (Next.js 16 proxy)

supabase/
├─ migrations/           SQL schema + RLS
└─ seed.sql              Reference data
```

---

## Credit model (business rules)

Defined in `src/lib/constants.ts`, enforced by the wallet engine in
Milestone 3:

- Every user starts at **0 credits**.
- Balances may go as low as **−100 credits**; purchasing freezes while
  negative until the balance returns to ≥ 0.
- A **6%** fee is taken from every completed transaction into the
  platform **reserve wallet** (seeded with a fixed id).

---

## Scripts

| Command         | Description                |
| --------------- | -------------------------- |
| `npm run dev`   | Start the dev server       |
| `npm run build` | Production build           |
| `npm run start` | Serve the production build |
| `npm run lint`  | ESLint                     |

---

## Deployment (Vercel)

1. Push the repo to GitHub.
2. Import it into Vercel as a Next.js project.
3. Add every variable from `.env.example` in **Vercel → Settings → Environment
   Variables** (use production Supabase credentials).
4. Set `NEXT_PUBLIC_SITE_URL` to your production domain.
5. Add `https://<your-domain>/auth/callback` to the Supabase Auth redirect
   allowlist.
6. Deploy.

---

## Security notes

- **Row Level Security** is enabled on every table; policies live in
  `supabase/migrations/0002_rls_policies.sql`.
- The `service_role` key is only ever used in `src/lib/supabase/admin.ts`,
  which is `server-only`.
- Session validity is always checked with `supabase.auth.getUser()` (verifies
  the JWT) — never `getSession()` — in the proxy and server helpers.
- Wallet balances are never writable by clients; all credit movement will go
  through `SECURITY DEFINER` database functions in Milestone 3.

---

## Milestone roadmap

- [x] **M1 — Foundation:** project setup, Supabase, full schema + RLS,
      email/password auth, email + phone verification, password reset,
      duplicate-account prevention, profiles, responsive shell, protected
      routes.
- [ ] **M2 — Marketplace core:** listings CRUD, photo upload, browse,
      search & filters, favorites, reports.
- [ ] **M3 — Wallet engine:** balances, reserve wallet, ledger, purchase
      eligibility, QR payment flow, atomic transfers + 6% fee.
- [ ] **M4 — Messaging & ratings:** Stream Chat, blocks, ratings/reviews,
      trust indicators.
- [ ] **M5 — Admin & launch:** admin dashboard, moderation, analytics,
      ad slots, static content management, deployment.
