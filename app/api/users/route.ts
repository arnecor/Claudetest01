import type { NextRequest } from 'next/server';
import { Prisma } from '@/app/generated/prisma/client';
import { badRequest, conflict, created, internalError, ok } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

// ── GET /api/users ────────────────────────────────────────────────────────────
// Returns all users ordered by creation date (newest first).
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, expiresAt: true, createdAt: true },
    });
    return ok(users);
  } catch (err) {
    return internalError(err);
  }
}

// ── POST /api/users ───────────────────────────────────────────────────────────
// Creates a new user. Body: { name: string; email: string; expiresAt: string }
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    if (
      typeof body !== 'object' ||
      body === null ||
      typeof (body as Record<string, unknown>)['name'] !== 'string' ||
      typeof (body as Record<string, unknown>)['email'] !== 'string' ||
      typeof (body as Record<string, unknown>)['expiresAt'] !== 'string'
    ) {
      return badRequest('Body must contain name (string), email (string) and expiresAt (string)');
    }

    const { name, email, expiresAt } = body as { name: string; email: string; expiresAt: string };

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) return badRequest('name must not be empty');
    if (!trimmedEmail.includes('@')) return badRequest('email is invalid');

    const expiresAtDate = new Date(expiresAt);
    if (isNaN(expiresAtDate.getTime())) return badRequest('expiresAt is not a valid date');

    const user = await prisma.user.create({
      data: { name: trimmedName, email: trimmedEmail, expiresAt: expiresAtDate },
      select: { id: true, name: true, email: true, expiresAt: true, createdAt: true },
    });

    return created(user);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return conflict('A user with that email already exists');
    }
    return internalError(err);
  }
}
