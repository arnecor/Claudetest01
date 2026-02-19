import Link from 'next/link';

export default function Home() {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: '6rem auto',
        padding: '0 1rem',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Fullstack App</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Next.js · Prisma · PostgreSQL · TypeScript</p>
      <Link
        href="/users"
        style={{
          display: 'inline-block',
          padding: '0.6rem 1.5rem',
          background: '#2563eb',
          color: '#fff',
          borderRadius: 6,
          textDecoration: 'none',
          fontWeight: 500,
        }}
      >
        Go to Users →
      </Link>
    </main>
  );
}
