import Link from 'next/link';
import PhysicsBackground from './components/PhysicsBackground';

export const metadata = {
  title: 'Axiom Studio — Learn Physics by Doing',
  description:
    'Four interactive physics simulations with an AI tutor that makes you predict first, then explains what really happened using your own numbers.',
};

// ── Shared logo ───────────────────────────────────────────────
function Logo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="14" stroke="#6d6af8" strokeWidth="1.5" />
      <ellipse cx="16" cy="16" rx="14" ry="5" stroke="#22d3ee" strokeWidth="1.5"
        strokeDasharray="3 2" transform="rotate(-30 16 16)" />
      <circle cx="16" cy="6" r="2.5" fill="#6d6af8" />
    </svg>
  );
}

// ── Mini sim previews (inline SVG, no JS) ─────────────────────
const SIM_CARDS = [
  {
    id: 'projectile',
    name: 'Projectile Motion',
    blurb: 'Find the angle that outranges them all — then launch it on the Moon.',
    concept: 'Kinematics',
    art: (
      <svg viewBox="0 0 120 70" fill="none" className="w-full">
        <path d="M8 60 Q45 5 112 26" stroke="#6d6af8" strokeWidth="2" strokeDasharray="4 4" fill="none" />
        <circle cx="112" cy="26" r="5" fill="#6d6af8" />
        <line x1="8" y1="60" x2="112" y2="60" stroke="#27273a" strokeWidth="1.5" />
        <circle cx="8" cy="60" r="3" fill="#8b88fb" />
      </svg>
    ),
  },
  {
    id: 'pendulum',
    name: 'Pendulum',
    blurb: 'Double the length and your gut feeling about time quietly breaks.',
    concept: 'Harmonic motion',
    art: (
      <svg viewBox="0 0 120 70" fill="none" className="w-full">
        <line x1="20" y1="10" x2="100" y2="10" stroke="#27273a" strokeWidth="2" />
        <line x1="60" y1="10" x2="92" y2="52" stroke="#6d6af8" strokeWidth="1.5" />
        <circle cx="92" cy="56" r="7" fill="#6d6af8" />
        <line x1="60" y1="10" x2="30" y2="52" stroke="#6d6af8" strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />
        <circle cx="30" cy="55" r="5" fill="#6d6af8" opacity="0.2" />
      </svg>
    ),
  },
  {
    id: 'orbits',
    name: 'Orbital Mechanics',
    blurb: 'Fling a planet and find the razor line between orbit, crash, and escape.',
    concept: 'Gravitation · 3D',
    badge: '3D',
    art: (
      <svg viewBox="0 0 120 70" fill="none" className="w-full">
        <ellipse cx="60" cy="35" rx="48" ry="24" stroke="#6d6af8" strokeWidth="1.5"
          strokeDasharray="3 3" transform="rotate(-12 60 35)" />
        <circle cx="60" cy="35" r="9" fill="#fb923c" />
        <circle cx="60" cy="35" r="15" fill="#fb923c" opacity="0.12" />
        <circle cx="106" cy="27" r="4.5" fill="#7070ee" />
      </svg>
    ),
  },
  {
    id: 'collisions',
    name: 'Collisions',
    blurb: 'Momentum always survives the hit — kinetic energy has other plans.',
    concept: 'Conservation laws',
    art: (
      <svg viewBox="0 0 120 70" fill="none" className="w-full">
        <line x1="10" y1="40" x2="110" y2="40" stroke="#27273a" strokeWidth="1.5" />
        <circle cx="44" cy="40" r="13" fill="rgba(109,106,248,0.15)" stroke="#6d6af8" strokeWidth="1.5" />
        <circle cx="80" cy="40" r="13" fill="rgba(34,211,238,0.12)" stroke="#22d3ee" strokeWidth="1.5" />
        <path d="M20 40 L30 40 M28 37 L31 40 L28 43" stroke="#6d6af8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M100 40 L90 40 M92 37 L89 40 L92 43" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

// ── How-it-works steps ────────────────────────────────────────
const STEPS = [
  {
    n: '01',
    title: 'Predict first',
    body: 'Before anything moves, you commit to an answer. Locking in a guess is what turns watching into learning.',
  },
  {
    n: '02',
    title: 'Run the experiment',
    body: 'Drag the sliders, change gravity, launch. Real physics engines — RK4 integration, true orbital mechanics — not canned animations.',
  },
  {
    n: '03',
    title: 'Understand why',
    body: 'Axion, the AI tutor, explains what happened using the exact numbers from your run — and never just hands you the answer.',
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-deep)' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <header
        className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-lg sm:text-xl font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
            Axiom <span style={{ color: 'var(--accent)' }}>Studio</span>
          </span>
        </div>

        <Link
          href="/hub"
          className="text-sm font-medium px-4 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-surface)', textDecoration: 'none' }}
        >
          Open Lab →
        </Link>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: 'var(--border)' }}>
        <PhysicsBackground />
        {/* radial vignette over the animation for readable text */}
        <div
          className="absolute inset-0 z-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 35%, rgba(13,13,18,0.2), rgba(13,13,18,0.85) 70%)' }}
        />

        <main className="axiom-page relative z-10 flex flex-col items-center justify-center text-center px-5 py-20 sm:py-28">
          <div
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-6"
            style={{ background: 'rgba(109,106,248,0.1)', border: '1px solid rgba(109,106,248,0.25)', color: '#8b88fb' }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee' }} />
            AI × STEM Education
          </div>

          <h1
            className="text-5xl sm:text-7xl font-bold tracking-tight max-w-3xl"
            style={{ color: 'var(--text)', lineHeight: 1.04, letterSpacing: '-0.02em' }}
          >
            Physics you can{' '}
            <span style={{ color: 'var(--accent)', textShadow: '0 0 48px #6d6af855' }}>
              actually touch.
            </span>
          </h1>

          <p
            className="mt-7 text-base sm:text-lg max-w-[46ch] mx-auto"
            style={{ color: 'var(--text-muted)', lineHeight: 1.78 }}
          >
            Textbooks tell you the answer. Axiom Studio makes you{' '}
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>predict it first</span>,
            run a real simulation, then has an AI tutor explain exactly what happened — using your numbers.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/hub"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none', boxShadow: '0 4px 28px rgba(109,106,248,0.4)' }}
            >
              Launch the Lab
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              href="/lab?sim=orbits"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold border transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--bg-surface)', textDecoration: 'none' }}
            >
              See the 3D orbit sim
            </Link>
          </div>
          <span className="mt-4 text-xs" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
            No account needed · runs entirely in your browser
          </span>
        </main>
      </section>

      {/* ── Problem statement ──────────────────────────────── */}
      <section className="px-5 sm:px-8 py-16 sm:py-20 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--accent)' }}>
            The problem
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-5" style={{ color: 'var(--text)', lineHeight: 1.2 }}>
            Most students memorize physics. Almost none of them get to <span style={{ color: 'var(--accent)' }}>experiment</span> with it.
          </h2>
          <p className="text-base sm:text-lg max-w-[62ch]" style={{ color: 'var(--text-muted)', lineHeight: 1.78 }}>
            Real lab equipment is expensive and rare. So physics becomes a wall of formulas to memorize,
            and intuition — the part that actually matters — never gets built. Axiom Studio turns any browser
            into a physics lab, and pairs it with a tutor that probes your reasoning instead of lecturing at you.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px mt-12 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            {[
              { stat: '4', label: 'real physics engines' },
              { stat: 'Predict-first', label: 'learning loop' },
              { stat: 'AI tutor', label: 'that uses your data' },
              { stat: '$0', label: 'lab equipment needed' },
            ].map(({ stat, label }) => (
              <div key={label} className="p-5 text-center" style={{ background: 'var(--bg-surface)' }}>
                <div className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--accent)' }}>{stat}</div>
                <div className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section className="px-5 sm:px-8 py-16 sm:py-20 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
              How it works
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
              Predict → Experiment → Understand
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                <div className="text-sm font-mono font-bold mb-4" style={{ color: 'var(--accent)' }}>{s.n}</div>
                <h3 className="text-lg font-semibold mb-2.5" style={{ color: 'var(--text)' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sim showcase ───────────────────────────────────── */}
      <section className="px-5 sm:px-8 py-16 sm:py-20 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
              Four worlds to break
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
              Each one hides a counter-intuitive surprise
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {SIM_CARDS.map((c) => (
              <Link key={c.id} href={`/lab?sim=${c.id}`} style={{ textDecoration: 'none' }}>
                <div className="hub-card rounded-xl border overflow-hidden h-full flex flex-col"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                  <div className="px-5 pt-5 pb-4" style={{ background: 'rgba(109,106,248,0.04)' }}>
                    {c.art}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{c.name}</h3>
                      {c.badge && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(34,211,238,0.08)', color: 'var(--cyan)', border: '1px solid rgba(34,211,238,0.25)' }}>
                          {c.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--text-muted)' }}>{c.blurb}</p>
                    <div className="text-xs mt-4 font-medium" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>{c.concept}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────── */}
      <section className="px-5 sm:px-8 py-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5" style={{ color: 'var(--text)', lineHeight: 1.1 }}>
          Stop reading about physics.
          <br />
          <span style={{ color: 'var(--accent)' }}>Start arguing with it.</span>
        </h2>
        <Link
          href="/hub"
          className="inline-flex items-center gap-2 mt-4 px-8 py-4 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none', boxShadow: '0 4px 28px rgba(109,106,248,0.4)' }}
        >
          Launch the Lab
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer
        className="text-center text-xs py-5 border-t"
        style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', opacity: 0.6 }}
      >
        Axiom Studio · Interactive physics, powered by an AI tutor
      </footer>

    </div>
  );
}
