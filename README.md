# Fullstack App

Next.js 16 · React 19 · TypeScript · Prisma 7 · PostgreSQL

## Stack

| Layer     | Technology                     |
|-----------|--------------------------------|
| Framework | Next.js 16 (App Router)        |
| Language  | TypeScript (strict)            |
| Database  | PostgreSQL                     |
| ORM       | Prisma 7                       |
| Linting   | ESLint 9 + eslint-config-next  |
| Formatting| Prettier                       |

> **Note:** `pnpm` was not available in the target environment; `npm` is used throughout.

---

## Prerequisites

- Node.js ≥ 18
- PostgreSQL running locally (or a connection string to a remote instance)

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set your PostgreSQL connection string:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/fullstack_app?schema=public"
```

Format: `postgresql://<user>:<password>@<host>:<port>/<database>?schema=public`

### 3. Run migrations

First-time setup (creates the database schema):

```bash
npm run db:migrate
# Prisma will prompt you for a migration name, e.g. "init"
```

After the first run, applying new migrations in development:

```bash
npm run db:migrate
```

In CI/production (no interactive prompts):

```bash
npm run db:migrate:prod
```

### 4. (Optional) Seed the database

Creates two example users (`alice@example.com`, `bob@example.com`):

```bash
npm run db:seed
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project structure

```
.
├── app/
│   ├── api/
│   │   └── users/
│   │       ├── route.ts          # GET /api/users, POST /api/users
│   │       └── [id]/
│   │           └── route.ts      # GET, PUT, DELETE /api/users/:id
│   ├── generated/
│   │   └── prisma/               # Auto-generated Prisma client (git-ignored)
│   ├── users/
│   │   └── page.tsx              # /users – list + create form
│   ├── layout.tsx
│   └── page.tsx                  # Home page with link to /users
├── lib/
│   ├── api-helpers.ts            # Typed NextResponse helpers (ok, created, …)
│   └── prisma.ts                 # PrismaClient singleton
├── prisma/
│   ├── migrations/               # SQL migration history
│   ├── schema.prisma             # Data model
│   └── seed.ts                   # Optional seed script
├── prisma.config.ts              # Prisma 7 config (datasource URL, paths)
├── .env                          # Local secrets – never commit!
├── .env.example                  # Safe template to commit
├── .prettierrc
└── eslint.config.mjs
```

---

## Available scripts

| Script               | Description                                         |
|----------------------|-----------------------------------------------------|
| `npm run dev`        | Start Next.js development server                    |
| `npm run build`      | Production build                                    |
| `npm run start`      | Start production server (after build)               |
| `npm run lint`       | Run ESLint                                          |
| `npm run format`     | Format all files with Prettier                      |
| `npm run format:check` | Check formatting without writing                  |
| `npm run db:generate`| Re-generate Prisma client after schema changes      |
| `npm run db:migrate` | Create and apply a migration (dev)                  |
| `npm run db:migrate:prod` | Apply migrations in production/CI             |
| `npm run db:push`    | Push schema directly without a migration (prototyping) |
| `npm run db:studio`  | Open Prisma Studio in the browser                   |
| `npm run db:seed`    | Run the seed script                                 |

---

## API reference

### Users

| Method   | Path               | Body / Notes                       |
|----------|--------------------|------------------------------------|
| `GET`    | `/api/users`       | Returns array of all users         |
| `POST`   | `/api/users`       | `{ name: string, email: string }`  |
| `GET`    | `/api/users/:id`   | Returns one user                   |
| `PUT`    | `/api/users/:id`   | `{ name?: string, email?: string }`|
| `DELETE` | `/api/users/:id`   | Returns 204 No Content             |

All error responses follow `{ error: string }`.

---

## Prisma 7 notes

**Driver adapters are required.** Prisma 7 removed its built-in Rust query engine; all database access now goes through driver adapters. This project uses `@prisma/adapter-pg` (backed by the Node.js `pg` library).

- **Runtime client:** created in `lib/prisma.ts` using `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`.
- **Migrations/CLI:** driven by `prisma.config.ts`, which reads `DATABASE_URL` via `dotenv/config`.
- **Generated client:** lives in `app/generated/prisma/` (git-ignored). Run `npm run db:generate` after any schema change.
- **Import path:** always import from `@/app/generated/prisma/client` (not the directory root — Prisma 7 has no `index.ts`).
