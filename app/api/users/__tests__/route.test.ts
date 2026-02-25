import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────
// vi.mock() is hoisted before imports, so these run before route.ts resolves.

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      create: vi.fn(),
    },
  },
}));

// Spread the real generated client so PrismaClientKnownRequestError's prototype
// is identical in both the route handler and the test — making instanceof work.
vi.mock('@/app/generated/prisma/client', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/app/generated/prisma/client')>();
  return { ...original };
});

// ── Imports after mocks ───────────────────────────────────────────────────────
import { POST } from '@/app/api/users/route';
import { Prisma } from '@/app/generated/prisma/client';
import { prisma } from '@/lib/prisma';

const mockCreate = vi.mocked(prisma.user.create);

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const EXPIRES_AT_STRING = '2027-06-15T00:00:00.000Z';
const EXPIRES_AT_DATE = new Date(EXPIRES_AT_STRING);

const CREATED_USER = {
  id: 'clxxxxxxxxxxxxxxxxxxxxxx',
  name: 'Alice',
  email: 'alice@example.com',
  expiresAt: EXPIRES_AT_DATE,
  createdAt: new Date('2026-02-25T10:00:00.000Z'),
};

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('POST /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Happy path ──────────────────────────────────────────────────────────────
  describe('happy path', () => {
    it('returns 201 with user data when input is valid', async () => {
      mockCreate.mockResolvedValueOnce(CREATED_USER);

      const res = await POST(
        makeRequest({ name: 'Alice', email: 'alice@example.com', expiresAt: EXPIRES_AT_STRING }),
      );
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body).toMatchObject({
        id: CREATED_USER.id,
        name: 'Alice',
        email: 'alice@example.com',
      });
    });

    it('calls prisma.user.create with correct arguments', async () => {
      mockCreate.mockResolvedValueOnce(CREATED_USER);

      await POST(
        makeRequest({ name: 'Alice', email: 'alice@example.com', expiresAt: EXPIRES_AT_STRING }),
      );

      expect(mockCreate).toHaveBeenCalledOnce();
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          name: 'Alice',
          email: 'alice@example.com',
          expiresAt: EXPIRES_AT_DATE,
        },
        select: { id: true, name: true, email: true, expiresAt: true, createdAt: true },
      });
    });
  });

  // ── Input normalisation ─────────────────────────────────────────────────────
  describe('input normalisation', () => {
    it('trims whitespace from name', async () => {
      mockCreate.mockResolvedValueOnce(CREATED_USER);

      await POST(
        makeRequest({ name: '  Alice  ', email: 'alice@example.com', expiresAt: EXPIRES_AT_STRING }),
      );

      expect(mockCreate.mock.calls[0][0].data.name).toBe('Alice');
    });

    it('trims whitespace from email', async () => {
      mockCreate.mockResolvedValueOnce(CREATED_USER);

      await POST(
        makeRequest({ name: 'Alice', email: '  alice@example.com  ', expiresAt: EXPIRES_AT_STRING }),
      );

      expect(mockCreate.mock.calls[0][0].data.email).toBe('alice@example.com');
    });

    it('lowercases the email', async () => {
      mockCreate.mockResolvedValueOnce(CREATED_USER);

      await POST(
        makeRequest({ name: 'Alice', email: 'ALICE@EXAMPLE.COM', expiresAt: EXPIRES_AT_STRING }),
      );

      expect(mockCreate.mock.calls[0][0].data.email).toBe('alice@example.com');
    });

    it('lowercases and trims email together', async () => {
      mockCreate.mockResolvedValueOnce(CREATED_USER);

      await POST(
        makeRequest({ name: 'Alice', email: '  ALICE@EXAMPLE.COM  ', expiresAt: EXPIRES_AT_STRING }),
      );

      expect(mockCreate.mock.calls[0][0].data.email).toBe('alice@example.com');
    });

    it('converts expiresAt string to a Date object', async () => {
      mockCreate.mockResolvedValueOnce(CREATED_USER);

      await POST(
        makeRequest({ name: 'Alice', email: 'alice@example.com', expiresAt: EXPIRES_AT_STRING }),
      );

      const expiresAt = mockCreate.mock.calls[0][0].data.expiresAt;
      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.toISOString()).toBe(EXPIRES_AT_STRING);
    });
  });

  // ── Body shape validation → 400 ─────────────────────────────────────────────
  describe('body validation → 400', () => {
    it('returns 400 when body is a plain string', async () => {
      const req = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '"not an object"',
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toMatch(/Body must contain name/);
    });

    it('returns 400 when body is null JSON', async () => {
      const req = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'null',
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when body is an array', async () => {
      const res = await POST(makeRequest([]));
      expect(res.status).toBe(400);
    });

    it('returns 400 when name field is missing', async () => {
      const res = await POST(
        makeRequest({ email: 'alice@example.com', expiresAt: EXPIRES_AT_STRING }),
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toMatch(/Body must contain name/);
    });

    it('returns 400 when email field is missing', async () => {
      const res = await POST(makeRequest({ name: 'Alice', expiresAt: EXPIRES_AT_STRING }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toMatch(/Body must contain name/);
    });

    it('returns 400 when expiresAt field is missing', async () => {
      const res = await POST(makeRequest({ name: 'Alice', email: 'alice@example.com' }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toMatch(/Body must contain name/);
    });

    it('returns 400 when name is a number instead of string', async () => {
      const res = await POST(
        makeRequest({ name: 42, email: 'alice@example.com', expiresAt: EXPIRES_AT_STRING }),
      );
      expect(res.status).toBe(400);
    });

    it('returns 400 when email is a boolean instead of string', async () => {
      const res = await POST(
        makeRequest({ name: 'Alice', email: true, expiresAt: EXPIRES_AT_STRING }),
      );
      expect(res.status).toBe(400);
    });
  });

  // ── Semantic validation → 400 ───────────────────────────────────────────────
  describe('semantic validation → 400', () => {
    it('returns 400 with "name must not be empty" when name is whitespace-only', async () => {
      const res = await POST(
        makeRequest({ name: '   ', email: 'alice@example.com', expiresAt: EXPIRES_AT_STRING }),
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('name must not be empty');
    });

    it('returns 400 with "name must not be empty" when name is empty string', async () => {
      const res = await POST(
        makeRequest({ name: '', email: 'alice@example.com', expiresAt: EXPIRES_AT_STRING }),
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('name must not be empty');
    });

    it('returns 400 with "email is invalid" when email has no @ symbol', async () => {
      const res = await POST(
        makeRequest({ name: 'Alice', email: 'notanemail', expiresAt: EXPIRES_AT_STRING }),
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('email is invalid');
    });

    it('returns 400 with "email is invalid" when email is whitespace-only', async () => {
      const res = await POST(
        makeRequest({ name: 'Alice', email: '   ', expiresAt: EXPIRES_AT_STRING }),
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('email is invalid');
    });

    it('returns 400 with "expiresAt is not a valid date" for a non-date string', async () => {
      const res = await POST(
        makeRequest({ name: 'Alice', email: 'alice@example.com', expiresAt: 'not-a-date' }),
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('expiresAt is not a valid date');
    });

    it('returns 400 with "expiresAt is not a valid date" for empty string', async () => {
      const res = await POST(
        makeRequest({ name: 'Alice', email: 'alice@example.com', expiresAt: '' }),
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('expiresAt is not a valid date');
    });

    it('does not call prisma when validation fails', async () => {
      await POST(
        makeRequest({ name: '', email: 'alice@example.com', expiresAt: EXPIRES_AT_STRING }),
      );
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  // ── Duplicate email → 409 ───────────────────────────────────────────────────
  describe('duplicate email → 409', () => {
    it('returns 409 when Prisma throws P2002 (unique constraint violation)', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`email`)',
        { code: 'P2002', clientVersion: '7.0.0' },
      );
      mockCreate.mockRejectedValueOnce(p2002);

      const res = await POST(
        makeRequest({ name: 'Alice', email: 'alice@example.com', expiresAt: EXPIRES_AT_STRING }),
      );
      const body = await res.json();

      expect(res.status).toBe(409);
      expect(body.error).toBe('A user with that email already exists');
    });
  });

  // ── Unexpected DB error → 500 ───────────────────────────────────────────────
  describe('unexpected DB error → 500', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns 500 with the error message when prisma throws a generic Error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('connection refused'));

      const res = await POST(
        makeRequest({ name: 'Alice', email: 'alice@example.com', expiresAt: EXPIRES_AT_STRING }),
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('connection refused');
    });

    it('returns 500 with "Internal server error" when thrown value is not an Error instance', async () => {
      mockCreate.mockRejectedValueOnce('raw string throw');

      const res = await POST(
        makeRequest({ name: 'Alice', email: 'alice@example.com', expiresAt: EXPIRES_AT_STRING }),
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Internal server error');
    });

    it('P2002 is never treated as 500', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError('conflict', {
        code: 'P2002',
        clientVersion: '7.0.0',
      });
      mockCreate.mockRejectedValueOnce(p2002);

      const res = await POST(
        makeRequest({ name: 'Alice', email: 'alice@example.com', expiresAt: EXPIRES_AT_STRING }),
      );

      expect(res.status).not.toBe(500);
      expect(res.status).toBe(409);
    });
  });
});
