# Prisma

Prisma 7 with `@prisma/adapter-pg` driver adapter. No Rust engine.

## Schema changes – checklist

1. Edit `prisma/schema.prisma`.
2. Run `npm run db:generate` to regenerate the client into `app/generated/prisma/`.
3. For local dev: `npm run db:push` or `npm run db:migrate`.
4. For Docker: `docker compose up --build` (entrypoint runs `prisma db push` on start).
5. Update `prisma/seed.ts` if the new field is required.

## Adding a required (non-nullable) field

Must provide a value for existing rows. Options:
- Add `@default(...)` in the schema (e.g. `@default(now())`), **or**
- Wipe the dev DB: `docker compose down -v && docker compose up --build`.

Using `--accept-data-loss` alone does **not** help when rows already exist with no default.

## Import path

```ts
// Correct
import { PrismaClient } from '@/app/generated/prisma/client';

// Wrong – no index.ts in Prisma 7
import { PrismaClient } from '@/app/generated/prisma';
```

## Seeding

```bash
npm run db:seed                                    # local
docker compose exec app npx tsx prisma/seed.ts     # inside Docker
```

Seed uses `upsert` so it is safe to run multiple times.

## CLI config

`prisma.config.ts` at the repo root loads `DATABASE_URL` via `dotenv/config` and points the CLI at `prisma/schema.prisma` and `prisma/migrations/`. The runtime client (`lib/prisma.ts`) reads `DATABASE_URL` directly from `process.env`.
