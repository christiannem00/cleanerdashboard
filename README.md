# Sergio — Cleaner Performance Dashboard

A multi-tenant web app for cleaning-company operators. Each operator signs in
with their email, uploads a BookingKoala CSV export, and gets a stored,
revisitable performance dashboard for their team (scoreboard, churn proxy,
refunds & comps, complaints-per-clean, and an underperformer view).

Built with **Next.js (App Router)** + **Supabase** (Auth + Postgres), deployed on **Vercel**.

## How it works
- **Auth**: passwordless email magic link (Supabase Auth). The operator's email is stored.
- **Upload**: the CSV is parsed *in the browser*; only the computed `{totals, cleaners}` summary is sent to Supabase — raw customer rows never leave the client except as the aggregated result you choose to save.
- **Storage**: each upload is a row in `public.uploads`, protected by row-level security so an operator only ever sees their own data.

## Local setup
1. `npm install`
2. Copy `.env.example` → `.env.local` and fill your Supabase URL + anon key.
3. In the Supabase SQL editor, run `supabase/schema.sql`.
4. `npm run dev` → http://localhost:3000

## Environment variables
| Key | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + local | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + local | public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | optional for v1 |

## Deploy (Vercel)
1. Import this repo in Vercel.
2. Add the two `NEXT_PUBLIC_SUPABASE_*` env vars.
3. In Supabase → Authentication → URL Configuration, add your Vercel URL to
   **Site URL** and **Redirect URLs** (`https://YOUR-APP.vercel.app/auth/callback`).
4. Deploy.

## Roadmap
- Real OpenPhone (Quo) integration for complaints-per-clean (currently sampled).
- Cancelled/paused recurring export → true client-churn attribution.
- Team roles / multiple users per company.
