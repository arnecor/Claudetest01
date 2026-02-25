'use client';

/**
 * /users – Client Component
 *
 * Why a Client Component?
 * The page combines a live-updating list with an interactive creation form.
 * Using useState + fetch keeps the UX responsive without the extra complexity
 * of a separate Server Action file. The API already runs on the server.
 */

import { useCallback, useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  name: string;
  email: string;
  expiresAt: string;
  createdAt: string;
}

interface FormState {
  name: string;
  email: string;
  expiresAt: string;
}

// ── Date helpers ───────────────────────────────────────────────────────────────

/** Returns today + 1 year as "dd.mm.yyyy". */
function defaultExpiryDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/** Converts a "dd.mm.yyyy" string to an ISO date string for the API. */
function toIso(ddmmyyyy: string): string {
  const [dd, mm, yyyy] = ddmmyyyy.split('.');
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd)).toISOString();
}

/** Converts an ISO date string (from API) back to "dd.mm.yyyy" for display. */
function toDisplay(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/** Returns true if the ISO date is before the start of today (local time). */
function isExpired(iso: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(iso) < today;
}

/**
 * Formats a raw digit string into "dd.mm.yyyy" progressively.
 * Dots are inserted automatically as the user types.
 * e.g. "03" → "03.", "0312" → "03.12.", "03122027" → "03.12.2027"
 */
function formatExpiryInput(raw: string): string {
  // Strip everything that is not a digit
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function fetchUsers(): Promise<User[]> {
  const res = await fetch('/api/users', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load users');
  return res.json() as Promise<User[]>;
}

async function createUser(data: FormState): Promise<User> {
  const payload = {
    name: data.name,
    email: data.email,
    expiresAt: toIso(data.expiresAt),
  };
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as User & { error?: string };
  if (!res.ok) throw new Error(json.error ?? 'Failed to create user');
  return json;
}

async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    const json = (await res.json()) as { error?: string };
    throw new Error(json.error ?? 'Failed to delete user');
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = { name: '', email: '', expiresAt: defaultExpiryDate() };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Load users ──────────────────────────────────────────────────────────────

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setUsers(await fetchUsers());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  // ── Create user ─────────────────────────────────────────────────────────────

  function validate(): string | null {
    if (!form.name.trim()) return 'Name is required';
    if (!form.email.trim()) return 'Email is required';
    if (!form.email.includes('@')) return 'Please enter a valid email address';
    if (form.expiresAt.length !== 10) return 'Expiry date must be in the format dd.mm.yyyy';
    const [dd, mm, yyyy] = form.expiresAt.split('.').map(Number);
    const date = new Date(yyyy, mm - 1, dd);
    if (isNaN(date.getTime()) || date.getDate() !== dd || date.getMonth() + 1 !== mm) {
      return 'Expiry date is not a valid date';
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const newUser = await createUser(form);
      setUsers((prev) => [newUser, ...prev]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Expiry date input handler ─────────────────────────────────────────────

  function handleExpiryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatExpiryInput(e.target.value);
    setForm((f) => ({ ...f, expiresAt: formatted }));
  }

  // ── Delete user ─────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main style={styles.main}>
      <h1 style={styles.heading}>Users</h1>

      {/* ── Create form ── */}
      <section style={styles.card}>
        <h2 style={styles.subheading}>Add a user</h2>
        <form onSubmit={(e) => void handleSubmit(e)} noValidate style={styles.form}>
          <label style={styles.label}>
            Name
            <input
              className="styled-input"
              style={styles.input}
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Jane Doe"
              disabled={submitting}
              aria-required="true"
            />
          </label>

          <label style={styles.label}>
            Email
            <input
              className="styled-input"
              style={styles.input}
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="jane@example.com"
              disabled={submitting}
              aria-required="true"
            />
          </label>

          <label style={styles.label}>
            Expiry date
            <input
              className="styled-input"
              style={styles.input}
              type="text"
              value={form.expiresAt}
              onChange={handleExpiryChange}
              placeholder="dd.mm.yyyy"
              maxLength={10}
              disabled={submitting}
              aria-required="true"
            />
          </label>

          {formError && (
            <p style={styles.error} role="alert">
              <span style={styles.errorIcon}>!</span>
              {formError}
            </p>
          )}

          <button className="btn-primary" style={styles.button} type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create user'}
          </button>
        </form>
      </section>

      {/* ── User list ── */}
      <section style={styles.card}>
        <div style={styles.listHeader}>
          <h2 style={styles.subheading}>All users</h2>
          <button
            className="btn-secondary"
            style={{ ...styles.button, ...styles.buttonSecondary, ...styles.buttonSmall }}
            onClick={() => void loadUsers()}
          >
            ↻ Refresh
          </button>
        </div>

        {loading && <p style={styles.muted}>Loading…</p>}
        {loadError && <p style={styles.error}><span style={styles.errorIcon}>!</span>{loadError}</p>}

        {!loading && !loadError && users.length === 0 && (
          <p style={styles.muted}>No users yet. Create one above!</p>
        )}

        {!loading && users.length > 0 && (
          <table className="user-table" style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Expires</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const expired = isExpired(user.expiresAt);
                return (
                  <tr
                    key={user.id}
                    className={expired ? 'expired-row' : ''}
                    style={expired ? styles.trExpired : styles.tr}
                  >
                    <td style={styles.td}>{user.name}</td>
                    <td style={styles.td}>{user.email}</td>
                    <td style={styles.td}>
                      {toDisplay(user.expiresAt)}
                      {expired
                        ? <span style={styles.expiredBadge}>Expired</span>
                        : <span style={styles.activeBadge}>Active</span>
                      }
                    </td>
                    <td style={styles.td}>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td style={styles.td}>
                      <button
                        className="btn-danger"
                        style={{ ...styles.button, ...styles.buttonDanger, ...styles.buttonSmall }}
                        onClick={() => void handleDelete(user.id)}
                        disabled={deletingId === user.id}
                        aria-label={`Delete ${user.name}`}
                      >
                        {deletingId === user.id ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

// ── Inline styles (no external CSS dependency) ────────────────────────────────

const styles = {
  main: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '2.5rem 1.5rem',
    fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
    color: '#374151',
    minHeight: '100vh',
  },
  heading: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#0F172A',
    marginBottom: '1.5rem',
    letterSpacing: '-0.02em',
  },
  subheading: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#0F172A',
    margin: 0,
  },
  card: {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 16,
    padding: '28px 32px',
    marginBottom: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.05)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 20,
    marginTop: 20,
  },
  label: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '10px 14px',
    border: '1.5px solid #D1D5DB',
    borderRadius: 10,
    fontSize: '0.9375rem',
    color: '#0F172A',
    background: '#fff',
    outline: 'none',
    width: '100%',
  },
  button: {
    alignSelf: 'flex-start' as const,
    padding: '10px 22px',
    background: '#22C55E',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: '0.9375rem',
    cursor: 'pointer',
    fontWeight: 600,
    boxShadow: '0 1px 4px rgba(34,197,94,0.3)',
  },
  buttonSmall: {
    padding: '7px 14px',
    fontSize: '0.8125rem',
  },
  buttonDanger: {
    background: '#EF4444',
    boxShadow: 'none',
  },
  buttonSecondary: {
    background: '#FFFFFF',
    color: '#22C55E',
    border: '1.5px solid #22C55E',
    boxShadow: 'none',
  },
  error: {
    color: '#EF4444',
    fontSize: '0.875rem',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  errorIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#FEE2E2',
    color: '#DC2626',
    fontSize: '0.7rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  muted: {
    color: '#9CA3AF',
    fontSize: '0.9rem',
    padding: '8px 0',
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.9rem',
  },
  th: {
    textAlign: 'left' as const,
    padding: '10px 12px',
    background: '#F8FAFC',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#6B7280',
    borderBottom: '1px solid #E2E8F0',
  },
  td: {
    padding: '14px 12px',
    borderBottom: '1px solid #F1F5F9',
    color: '#374151',
    verticalAlign: 'middle' as const,
  },
  tr: {},
  trExpired: {
    background: '#FFF5F5',
  },
  expiredBadge: {
    marginLeft: 8,
    padding: '2px 10px',
    background: '#FEE2E2',
    color: '#DC2626',
    borderRadius: 999,
    fontSize: '0.75rem',
    fontWeight: 600,
    verticalAlign: 'middle' as const,
    display: 'inline-block',
  },
  activeBadge: {
    marginLeft: 8,
    padding: '2px 10px',
    background: '#DCFCE7',
    color: '#16A34A',
    borderRadius: 999,
    fontSize: '0.75rem',
    fontWeight: 600,
    verticalAlign: 'middle' as const,
    display: 'inline-block',
  },
} as const;
