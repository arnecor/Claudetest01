import type { NextRequest } from 'next/server';
import { Prisma } from '@/app/generated/prisma/client';
import { badRequest, conflict, internalError, noContent, notFound, ok } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

// ── GET /api/users/:id ────────────────────────────────────────────────────────
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, expiresAt: true, createdAt: true, updatedAt: true },
    });
    if (!user) return notFound('User not found');
    return ok(user);
  } catch (err) {
    return internalError(err);
  }
}

// ── PUT /api/users/:id ────────────────────────────────────────────────────────
// Updates name and/or email. Body: { name?: string; email?: string }
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body: unknown = await request.json();

    if (typeof body !== 'object' || body === null) {
      return badRequest('Request body must be a JSON object');
    }

    const { name, email } = body as Record<string, unknown>;
    const data: Prisma.UserUpdateInput = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return badRequest('name must be a non-empty string');
      }
      data.name = name.trim();
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || !email.trim().includes('@')) {
        return badRequest('email is invalid');
      }
      data.email = email.trim().toLowerCase();
    }

    if (Object.keys(data).length === 0) {
      return badRequest('Provide at least one field to update: name, email');
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, expiresAt: true, createdAt: true, updatedAt: true },
    });

    return ok(user);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') return notFound('User not found');
      if (err.code === 'P2002') return conflict('A user with that email already exists');
    }
    return internalError(err);
  }
}

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await prisma.user.delete({ where: { id } });
    return noContent();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return notFound('User not found');
    }
    return internalError(err);
  }
}
