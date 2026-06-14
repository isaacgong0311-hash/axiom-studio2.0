// /lab — the interactive simulation lab.
// Accepts ?sim=<id> to open directly at a particular sim (set by the hub).
import Link from 'next/link';
import SimLab from '../components/SimLab';

export const metadata = {
  title: 'Lab — Axiom Studio',
};

const VALID_SIMS = ['projectile', 'pendulum', 'orbits', 'collisions'];

export default async function LabPage({ searchParams }) {
  const params    = await searchParams;
  const initialSim = VALID_SIMS.includes(params?.sim) ? params.sim : 'projectile';

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-deep)' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Logo — clicking goes back to the hub */}
        <Link
          href="/hub"
          className="flex items-center gap-3 transition-opacity hover:opacity-75"
          style={{ textDecoration: 'none' }}
        >
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="#6d6af8" strokeWidth="1.5" />
            <ellipse
              cx="16" cy="16" rx="14" ry="5"
              stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="3 2"
              transform="rotate(-30 16 16)"
            />
            <circle cx="16" cy="6" r="2.5" fill="#6d6af8" />
          </svg>
          <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
            Axiom <span style={{ color: 'var(--accent)' }}>Studio</span>
          </span>
        </Link>

        <div className="flex items-center gap-5">
          {/* Back to hub */}
          <Link
            href="/hub"
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-75"
            style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L3 7l6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All topics
          </Link>
          <span className="hidden sm:block text-xs" style={{ color: 'var(--text-muted)' }}>
            Interactive Physics Lab
          </span>
        </div>
      </header>

      {/* ── Lab content ───────────────────────────────────── */}
      <main className="axiom-page flex-1 px-3 sm:px-5 py-4 sm:py-5 w-full max-w-[1400px] mx-auto">
        <SimLab initialSim={initialSim} />
      </main>

    </div>
  );
}
