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
      select: { id: true, name: true, email: true, createdAt: true },
    });
    return ok(users);
  } catch (err) {
    return internalError(err);
  }
}

// ── POST /api/users ───────────────────────────────────────────────────────────
// Creates a new user. Body: { name: string; email: string }
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    if (
      typeof body !== 'object' ||
      body === null ||
      typeof (body as Record<string, unknown>)['name'] !== 'string' ||
      typeof (body as Record<string, unknown>)['email'] !== 'string'
    ) {
      return badRequest('Body must contain name (string) and email (string)');
    }

    const { name, email } = body as { name: string; email: string };

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) return badRequest('name must not be empty');
    if (!trimmedEmail.includes('@')) return badRequest('email is invalid');

    const user = await prisma.user.create({
      data: { name: trimmedName, email: trimmedEmail },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    return created(user);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return conflict('A user with that email already exists');
    }
    return internalError(err);
  }
}
