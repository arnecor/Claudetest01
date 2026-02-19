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
  createdAt: string;
}

interface FormState {
  name: string;
  email: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchUsers(): Promise<User[]> {
  const res = await fetch('/api/users', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load users');
  return res.json() as Promise<User[]>;
}

async function createUser(data: FormState): Promise<User> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
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

const EMPTY_FORM: FormState = { name: '', email: '' };

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
              style={styles.input}
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="jane@example.com"
              disabled={submitting}
              aria-required="true"
            />
          </label>

          {formError && <p style={styles.error} role="alert">{formError}</p>}

          <button style={styles.button} type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create user'}
          </button>
        </form>
      </section>

      {/* ── User list ── */}
      <section style={styles.card}>
        <div style={styles.listHeader}>
          <h2 style={styles.subheading}>All users</h2>
          <button style={{ ...styles.button, ...styles.buttonSmall }} onClick={() => void loadUsers()}>
            Refresh
          </button>
        </div>

        {loading && <p style={styles.muted}>Loading…</p>}
        {loadError && <p style={styles.error}>{loadError}</p>}

        {!loading && !loadError && users.length === 0 && (
          <p style={styles.muted}>No users yet. Create one above!</p>
        )}

        {!loading && users.length > 0 && (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={styles.tr}>
                  <td style={styles.td}>{user.name}</td>
                  <td style={styles.td}>{user.email}</td>
                  <td style={styles.td}>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    <button
                      style={{ ...styles.button, ...styles.buttonDanger, ...styles.buttonSmall }}
                      onClick={() => void handleDelete(user.id)}
                      disabled={deletingId === user.id}
                      aria-label={`Delete ${user.name}`}
                    >
                      {deletingId === user.id ? '…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
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
    maxWidth: 720,
    margin: '0 auto',
    padding: '2rem 1rem',
    fontFamily: 'system-ui, sans-serif',
    color: '#111',
  },
  heading: { fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem' },
  subheading: { fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem' },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,.06)',
  },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
  label: { display: 'flex', flexDirection: 'column' as const, gap: '0.25rem', fontSize: '0.9rem', fontWeight: 500 },
  input: {
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: '1rem',
    outline: 'none',
  },
  button: {
    alignSelf: 'flex-start' as const,
    padding: '0.5rem 1.25rem',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontWeight: 500,
  },
  buttonSmall: { padding: '0.25rem 0.75rem', fontSize: '0.8rem' },
  buttonDanger: { background: '#dc2626' },
  error: { color: '#dc2626', fontSize: '0.875rem', margin: '0.25rem 0' },
  muted: { color: '#6b7280', fontSize: '0.9rem' },
  listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.9rem' },
  th: { textAlign: 'left' as const, padding: '0.5rem', borderBottom: '2px solid #e5e7eb', fontWeight: 600 },
  td: { padding: '0.5rem', borderBottom: '1px solid #f3f4f6' },
  tr: {},
} as const;
