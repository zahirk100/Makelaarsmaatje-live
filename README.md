# Makelaarsmaatje — Productie

Volledige versie met Supabase database, login, en Funda webhook.

## Stack

- Next.js 14 (App Router)
- React 18 + TypeScript
- Supabase (Postgres + Auth + Row Level Security)
- Vercel hosting

## Lokaal draaien

```bash
npm install
cp .env.example .env.local   # vul Supabase keys in
npm run dev
```

Open http://localhost:3000

## Deployment

Zie `../DEPLOYMENT.md` voor stap-voor-stap instructies.

## Mappenstructuur

```
app/
├── api/webhook/funda/   ← Funda lead-intake endpoint
├── dashboard/           ← Hoofdscherm na login
├── login/               ← Login formulier
├── actions.ts           ← Server actions (logout)
├── globals.css          ← Styling
├── layout.tsx           ← Root layout
└── page.tsx             ← Landing page

components/
└── Logo.tsx             ← Logo component

lib/
├── supabase/
│   ├── client.ts        ← Browser-side client
│   └── server.ts        ← Server-side client
└── utils.ts             ← Utility functions

supabase/migrations/
├── 001_initial_schema.sql   ← Tabellen + RLS
└── 002_seed_data.sql        ← Demo data (pas e-mail aan!)

types/
└── index.ts             ← TypeScript types

middleware.ts            ← Auth refresh + protected routes
```

## Environment variables

Vereist (zie `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (geheim, alleen server)
- `WEBHOOK_SECRET` (verzin een lange random string)
- `NEXT_PUBLIC_APP_URL`
