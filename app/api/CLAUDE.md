# API Routes

Next.js App Router route handlers. All helpers imported from `@/lib/api-helpers`.

## Structure

```
app/api/
  users/
    route.ts        # GET /api/users, POST /api/users
    [id]/route.ts   # GET /api/users/:id, PUT /api/users/:id, DELETE /api/users/:id
```

## Adding a new resource

1. Create `app/api/<resource>/route.ts` for collection endpoints (GET all, POST).
2. Create `app/api/<resource>/[id]/route.ts` for single-item endpoints (GET, PUT, DELETE).
3. Use `RouteContext = { params: Promise<{ id: string }> }` and `await context.params` — params are async in Next.js 15+.
4. Add the new field to `prisma/schema.prisma` and run `npm run db:generate`.

## Response helpers (lib/api-helpers.ts)

| Helper | Status | Use for |
|---|---|---|
| `ok(data)` | 200 | Successful GET / PUT |
| `created(data)` | 201 | Successful POST |
| `noContent()` | 204 | Successful DELETE |
| `badRequest(msg)` | 400 | Validation failures |
| `notFound(msg)` | 404 | Record not found |
| `conflict(msg)` | 409 | Unique constraint violation |
| `internalError(err)` | 500 | Catch-all; also logs to console |

## Prisma error codes to handle

- `P2002` → unique constraint violation → `conflict()`
- `P2025` → record not found (update/delete) → `notFound()`
