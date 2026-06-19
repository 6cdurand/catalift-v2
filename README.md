# Catalift v2

Coaching operating system for personal trainers.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Supabase (Auth + Postgres + Realtime + Storage)
- Zustand (user-scoped persist)
- Playwright (e2e smoke tests)

## Getting started

```bash
npm install
cp .env.example .env.local  # fill in Supabase URL + anon key
npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (webpack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npm test` | Playwright e2e |

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for module boundaries and critical design rules.