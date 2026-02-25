import Link from 'next/link';

export default function Home() {
  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <div style={styles.logoMark}>U</div>
        <h1 style={styles.heading}>User Management</h1>
        <p style={styles.subtitle}>Next.js · Prisma · PostgreSQL · TypeScript</p>
        <Link href="/users" className="btn-primary" style={styles.link}>
          Go to Users →
        </Link>
      </div>
    </main>
  );
}

const styles = {
  main: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    background: '#F0FDF4',
  },
  card: {
    background: '#FFFFFF',
    borderRadius: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.05)',
    border: '1px solid #E2E8F0',
    padding: '48px 56px',
    textAlign: 'center' as const,
    maxWidth: 420,
    width: '100%',
  },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: '#22C55E',
    color: '#fff',
    fontSize: '1.5rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    boxShadow: '0 2px 8px rgba(34,197,94,0.35)',
  },
  heading: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: '0.875rem',
    marginBottom: 32,
    lineHeight: 1.5,
  },
  link: {
    display: 'inline-block',
    padding: '10px 24px',
    background: '#22C55E',
    color: '#fff',
    borderRadius: 10,
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '0.9375rem',
    boxShadow: '0 1px 4px rgba(34,197,94,0.3)',
  },
} as const;
