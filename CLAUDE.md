# CLAUDE.md

## Architecture

Single Next.js process serves both the React UI (`app/`) and the REST API (`app/api/`). No separate backend. Two Docker containers: `app` (Next.js on port 3000) and `db` (PostgreSQL 16 on port 5432).

```
Browser → Next.js (app router)
              ├── /users          → app/users/page.tsx       (Client Component)
              ├── /api/users      → app/api/users/route.ts
              └── /api/users/:id → app/api/users/[id]/route.ts
                      ↓
              lib/prisma.ts  (singleton PrismaClient)
                      ↓
              PostgreSQL via @prisma/adapter-pg
```

## Tech Stack

| | Version |
|---|---|
| Next.js | 16.1.6 (App Router, Turbopack) |
| React | 19.2.3 |
| TypeScript | 5.x (strict mode) |
| Prisma | 7.4.1 |
| PostgreSQL | 16 |
| Node.js | 20 (alpine in Docker) |
| Package manager | **npm** (pnpm is not available) |

## Key Files

```
app/
  api/users/route.ts          # GET /api/users, POST /api/users
  api/users/[id]/route.ts     # GET, PUT, DELETE /api/users/:id
  users/page.tsx              # /users UI – list + create form (Client Component)
  generated/prisma/           # Auto-generated Prisma client (git-ignored, never edit)
  layout.tsx                  # Root layout (Geist fonts, globals.css)
  page.tsx                    # Home page – just a link to /users
lib/
  api-helpers.ts              # Typed response helpers: ok(), created(), badRequest(), etc.
  prisma.ts                   # PrismaClient singleton (dev hot-reload safe)
prisma/
  schema.prisma               # Data model
  seed.ts                     # Optional seed: alice@example.com, bob@example.com
  migrations/                 # SQL migration history (dev only)
prisma.config.ts              # Prisma 7 CLI config (reads DATABASE_URL via dotenv)
docker-compose.yml            # app + db services
Dockerfile                    # 3-stage build: deps → builder → runner
docker-entrypoint.sh          # Runs `prisma db push` then `next start`
```

## Running the Project

### Docker (recommended)
```bash
docker compose up --build          # Build image, sync DB schema, start app
docker compose down                # Stop (data preserved)
docker compose down -v             # Stop + delete DB volume (full reset)
```
App: http://localhost:3000 — DB: localhost:5432 (user: postgres, password: password, db: fullstack_app)

### Local development
```bash
cp .env.example .env               # Set DATABASE_URL
npm install
npm run db:push                    # Sync schema to local DB (no migration file)
npm run dev                        # Start dev server on :3000
```

### Useful scripts
```bash
npm run db:generate    # Regenerate Prisma client after schema changes
npm run db:seed        # Seed alice + bob (uses tsx, no compile step)
npm run db:studio      # Prisma Studio GUI
npm run lint           # ESLint
npm run format         # Prettier (write)
```

## Prisma 7 – Critical Differences from Prisma 5/6

**Driver adapters are mandatory.** Prisma 7 removed the built-in Rust query engine.

- The runtime client (`lib/prisma.ts`) uses `@prisma/adapter-pg` backed by the `pg` library.
- Always import from `@/app/generated/prisma/client` — **not** the directory root (no `index.ts` in Prisma 7).
- After any schema change run `npm run db:generate` locally, then `docker compose up --build` to rebuild the image.
- `prisma.config.ts` drives the CLI (migrations, db push, studio). It loads `DATABASE_URL` via `dotenv/config`.

## API Conventions

All route handlers use the helpers in `lib/api-helpers.ts`:

```ts
return ok(data);          // 200
return created(data);     // 201
return noContent();       // 204
return badRequest('msg'); // 400
return notFound('msg');   // 404
return conflict('msg');   // 409
return internalError(err);// 500 + console.error
```

Error responses always have the shape `{ error: string }`.

Body validation is done with manual `typeof` checks (no Zod/Yup). Pattern:
```ts
const body: unknown = await request.json();
if (typeof body !== 'object' || body === null || typeof (body as Record<string, unknown>)['field'] !== 'string') {
  return badRequest('...');
}
```

## UI Conventions

- Pages that need state or interactivity are **Client Components** (`'use client'`).
- **No CSS framework or CSS modules** — all styles are inline JS objects in a `const styles = { ... } as const` block at the bottom of the file.
- API calls from the client use plain `fetch()`, not SWR/React Query.
- Forms use controlled inputs with a single `FormState` object and a `validate()` function before submit.

## Data Model

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  expiresAt DateTime                        // required; UI defaults to today+1 year
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@map("users")
}
```

Date fields are stored as UTC `DateTime` in Postgres. The UI receives ISO strings from the API and formats them to `dd.mm.yyyy` for display.

## Pitfalls & Non-Obvious Decisions

**Adding a required column to an existing DB** requires either a DB-level default in the schema or a full volume reset (`docker compose down -v`). `prisma db push --accept-data-loss` alone is not enough if existing rows are present.

**Dockerfile dummy DATABASE_URL**: The builder stage sets `DATABASE_URL=postgresql://postgres:placeholder@localhost:5432/placeholder` so that `lib/prisma.ts` can initialise at module load during `next build` without a real DB connection. The real URL is injected at runtime via `docker-compose.yml`.

**Two pg packages in package.json**: Both `pg` and `postgres` are listed. Only `pg` is actually used (via `@prisma/adapter-pg`). The `postgres` package is unused and can be removed in a future cleanup.

**Schema sync strategy**: Docker uses `prisma db push` (not migrations) via the entrypoint. Migrations (`prisma/migrations/`) exist for local dev (`npm run db:migrate`) but are not applied in Docker.

**Unused vars convention**: Prefix with `_` (e.g. `_request`) to satisfy the ESLint `no-unused-vars` rule which ignores `^_` pattern.
