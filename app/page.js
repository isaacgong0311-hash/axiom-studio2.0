import Link from 'next/link';

export const metadata = {
  title: 'Axiom Studio — Learn Physics by Doing',
  description: 'Four interactive physics simulations with an AI tutor. Predict, experiment, and understand the physics behind what really happens.',
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-deep)' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="14" stroke="#6d6af8" strokeWidth="1.5" />
            <ellipse
              cx="16" cy="16" rx="14" ry="5"
              stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="3 2"
              transform="rotate(-30 16 16)"
            />
            <circle cx="16" cy="6" r="2.5" fill="#6d6af8" />
          </svg>
          <span className="text-lg sm:text-xl font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
            Axiom <span style={{ color: 'var(--accent)' }}>Studio</span>
          </span>
        </div>

        <Link
          href="/hub"
          className="text-sm font-medium px-4 py-1.5 rounded-lg border"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text-muted)',
            background: 'var(--bg-surface)',
            textDecoration: 'none',
            transition: 'color 0.15s, border-color 0.15s',
          }}
        >
          Open Lab →
        </Link>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <main className="axiom-page flex flex-1 flex-col items-center justify-center text-center px-5 py-16 sm:py-24">

        {/* Eyebrow */}
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-5"
          style={{ color: 'var(--accent)', letterSpacing: '0.1em' }}
        >
          Interactive Physics Lab
        </p>

        {/* Headline */}
        <h1
          className="text-5xl sm:text-6xl font-bold tracking-tight max-w-2xl"
          style={{ color: 'var(--text)', lineHeight: 1.06, letterSpacing: '-0.02em' }}
        >
          Physics,{' '}
          <span style={{ color: 'var(--accent)', textShadow: '0 0 48px #6d6af855' }}>
            Understood.
          </span>
        </h1>

        {/* Body copy */}
        <p
          className="mt-6 text-base sm:text-lg max-w-[40ch] mx-auto"
          style={{ color: 'var(--text-muted)', lineHeight: 1.78 }}
        >
          Four physics simulations with an AI tutor that challenges you to{' '}
          <span style={{ color: 'var(--text)', fontWeight: 500 }}>predict first</span>,
          then explains exactly what happened — using your numbers.
        </p>

        {/* Feature pills */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {[
            'Projectile Motion',
            'Pendulum Dynamics',
            'Orbital Mechanics',
            'Collisions',
          ].map((f) => (
            <span
              key={f}
              className="text-sm px-3.5 py-1.5 rounded-full border"
              style={{
                color: 'var(--text-muted)',
                borderColor: 'var(--border)',
                background: 'var(--bg-surface)',
              }}
            >
              {f}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-11 flex flex-col items-center gap-3">
          <Link
            href="/hub"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-85"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              textDecoration: 'none',
              letterSpacing: '0.01em',
              boxShadow: '0 4px 24px rgba(109,106,248,0.35)',
            }}
          >
            Launch the Lab
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <span className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
            No account needed · runs in the browser
          </span>
        </div>

      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer
        className="text-center text-xs py-4 border-t"
        style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', opacity: 0.6 }}
      >
        Axiom Studio
      </footer>

    </div>
  );
}
