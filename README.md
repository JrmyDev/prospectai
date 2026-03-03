## Getting Started

Install dependencies and run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Database strategy

This project uses two Prisma schemas:

1. Local development: SQLite (`prisma/schema.prisma`)
2. Vercel deployment: Postgres (`prisma/schema.postgres.prisma`)

Runtime switching is handled in `src/lib/prisma.ts`:

1. `VERCEL=1` -> Postgres adapter (`@prisma/adapter-pg`) with `DATABASE_URL`
2. Otherwise -> local SQLite (`dev.db`) via `@prisma/adapter-better-sqlite3`

## Environment variables

1. Local: no Postgres variable required (SQLite `dev.db` is used)
2. Vercel: set `DATABASE_URL` to your Postgres connection string

## Prisma commands

```bash
pnpm db:generate
pnpm db:generate:sqlite
pnpm db:generate:postgres
pnpm db:push:sqlite
pnpm db:push:postgres
```

`pnpm dev` and `pnpm build` call `pnpm db:generate` automatically.

## Deploy to Vercel

1. Connect your repository to Vercel.
2. Attach Vercel Postgres (or set `DATABASE_URL` manually).
3. Deploy.
4. Initialize/update Postgres schema:

```bash
pnpm db:push:postgres
```

## Migrating old local SQLite data

Existing local SQLite data (`dev.db`) is not migrated automatically.

Options:

1. One-time import with `pgloader`.
2. Add a one-off import script SQLite -> Postgres.
