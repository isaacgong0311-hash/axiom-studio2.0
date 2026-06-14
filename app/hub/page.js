// /hub — Concept hub: pick a topic to explore before entering the lab.
import Link from 'next/link';
import HubProgressBadge from '../components/HubProgressBadge';
import HubOverallProgress from '../components/HubOverallProgress';
import IntuitionMeter from '../components/IntuitionMeter';

export const metadata = { title: 'Explore — Axiom Studio' };

// ── Shared logo SVG ───────────────────────────────────────────
function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" stroke="#6d6af8" strokeWidth="1.5" />
      <ellipse cx="16" cy="16" rx="14" ry="5" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="3 2" transform="rotate(-30 16 16)" />
      <circle cx="16" cy="6" r="2.5" fill="#6d6af8" />
    </svg>
  );
}

// ── Sim card data ─────────────────────────────────────────────
const CARDS = [
  {
    id:   'projectile',
    name: 'Projectile Motion',
    desc: 'Aim, launch, and find the angle that outranges all others — then try the whole thing on the Moon.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path d="M4 35 Q14 6 36 12" stroke="#6d6af8" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="36" cy="12" r="4.5" fill="#6d6af8" opacity="0.9" />
        <circle cx="5.5" cy="33.5" r="2.5" fill="#6d6af8" opacity="0.4" />
      </svg>
    ),
  },
  {
    id:   'pendulum',
    name: 'Pendulum',
    desc: 'A weight on a string hides a deep secret about time. Change the length and your gut feeling breaks.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <line x1="8" y1="7" x2="32" y2="7" stroke="#6d6af8" strokeWidth="2" strokeLinecap="round" />
        <line x1="20" y1="7" x2="29" y2="31" stroke="#6d6af8" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="29" cy="34" r="5" fill="#6d6af8" opacity="0.9" />
        {/* Ghost position */}
        <line x1="20" y1="7" x2="12" y2="31" stroke="#6d6af8" strokeWidth="1" strokeLinecap="round" opacity="0.25" strokeDasharray="2 2" />
        <circle cx="12" cy="34" r="4" fill="#6d6af8" opacity="0.18" />
      </svg>
    ),
  },
  {
    id:   'orbits',
    name: 'Orbital Mechanics',
    desc: 'Fling a planet around a star and find the exact line between orbit, crash, and escape.',
    is3D: true,
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        {/* Star */}
        <circle cx="20" cy="20" r="5" fill="#fb923c" opacity="0.95" />
        {/* Orbit ellipse */}
        <ellipse cx="20" cy="20" rx="16" ry="9" stroke="#6d6af8" strokeWidth="1.5" strokeDasharray="3 2.5" transform="rotate(-18 20 20)" />
        {/* Planet */}
        <circle cx="35" cy="16" r="3" fill="#7070ee" />
      </svg>
    ),
  },
  {
    id:   'collisions',
    name: 'Collisions',
    desc: 'Two balls meet in the middle — momentum always makes it through, but kinetic energy has other plans.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        {/* Ball 1 — indigo */}
        <circle cx="13" cy="20" r="9" fill="rgba(109,106,248,0.12)" stroke="#6d6af8" strokeWidth="1.5" />
        {/* Ball 2 — cyan */}
        <circle cx="27" cy="20" r="9" fill="rgba(34,211,238,0.10)" stroke="#22d3ee" strokeWidth="1.5" />
        {/* Velocity arrows */}
        <path d="M3 18.5 L7 20 L3 21.5" stroke="#6d6af8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M37 18.5 L33 20 L37 21.5" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

// ── Page ──────────────────────────────────────────────────────
export default function HubPage() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-deep)' }}>

      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <Link
          href="/"
          className="flex items-center gap-3 transition-opacity hover:opacity-75"
          style={{ textDecoration: 'none' }}
        >
          <Logo />
          <span className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
            Axiom <span style={{ color: 'var(--accent)' }}>Studio</span>
          </span>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-75"
          style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L3 7l6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Home
        </Link>
      </header>

      {/* ── Content ── */}
      <main className="axiom-page flex-1 px-5 sm:px-6 py-10 sm:py-16 w-full max-w-4xl mx-auto">

        {/* Intro */}
        <div className="text-center mb-12">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-5"
            style={{ color: 'var(--accent)' }}
          >
            Interactive Physics
          </p>
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight mb-5"
            style={{ color: 'var(--text)', lineHeight: 1.08 }}
          >
            Pick something to explore
          </h1>
          <p
            className="text-lg max-w-[38ch] mx-auto"
            style={{ color: 'var(--text-muted)', lineHeight: 1.72 }}
          >
            No lessons. No quizzes. Just physics you can actually touch —
            predict what happens, run it, and ask the AI tutor why.
          </p>
        </div>

        {/* Axion greeting — brief intro, same voice that continues into every sim */}
        <div className="flex items-start justify-center gap-3 mb-10">
          <div style={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0, marginTop: 2,
            background: 'linear-gradient(135deg, #6d6af8, #22d3ee)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: '#fff',
          }}>A</div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Hi — I&apos;m <span style={{ color: 'var(--text)', fontWeight: 600 }}>Axion</span>,
              your AI physics guide. Pick a topic and I&apos;ll walk you through it.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <Link href="/lab?sim=projectile" style={{
                fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 8,
                background: 'rgba(109,106,248,0.1)', border: '1px solid rgba(109,106,248,0.25)',
                color: '#8b88fb', textDecoration: 'none',
              }}>→ Start with projectile motion</Link>
              <Link href="/lab?sim=orbits" style={{
                fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 8,
                background: 'rgba(109,106,248,0.1)', border: '1px solid rgba(109,106,248,0.25)',
                color: '#8b88fb', textDecoration: 'none',
              }}>→ Try orbital mechanics (3D)</Link>
            </div>
          </div>
        </div>

        {/* Physics Intuition meter — the signature predict-first mechanic */}
        <div className="mb-5">
          <IntuitionMeter />
        </div>

        {/* Overall progress (only visible once user has solved something) */}
        <div className="mb-8">
          <HubOverallProgress />
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {CARDS.map((card) => (
            <Link key={card.id} href={`/lab?sim=${card.id}`} style={{ textDecoration: 'none', display: 'flex' }}>
              <div
                className="hub-card rounded-xl border p-6 flex flex-col gap-4 w-full"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
              >
                {/* Icon row */}
                <div className="flex items-start justify-between">
                  <div
                    className="flex items-center justify-center rounded-xl"
                    style={{ width: 52, height: 52, background: 'rgba(109,106,248,0.10)', flexShrink: 0 }}
                  >
                    {card.icon}
                  </div>
                  {card.is3D && (
                    <span
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                      style={{
                        background:  'rgba(34,211,238,0.08)',
                        color:       'var(--cyan)',
                        border:      '1px solid rgba(34,211,238,0.25)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      3D
                    </span>
                  )}
                </div>

                {/* Name + description */}
                <div className="flex-1">
                  <h2
                    className="text-lg font-semibold mb-2"
                    style={{ color: 'var(--text)' }}
                  >
                    {card.name}
                  </h2>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {card.desc}
                  </p>
                </div>

                {/* Per-sim progress */}
                <HubProgressBadge simId={card.id} />

                {/* Explore link */}
                <div
                  className="flex items-center gap-1.5 text-sm font-semibold"
                  style={{ color: 'var(--accent)' }}
                >
                  Explore
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ marginTop: 1 }}>
                    <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer
        className="text-center text-xs py-4 border-t"
        style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', opacity: 0.6 }}
      >
        Axiom Studio
      </footer>

    </div>
  );
}
