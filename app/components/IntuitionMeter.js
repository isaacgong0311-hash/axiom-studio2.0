'use client';

// Physics Intuition meter — the app's signature idea made visible.
// Every sim asks you to predict before you run it; this gauge scores how
// often your gut matched reality. It's not a quiz grade — it's a measure
// of calibrated intuition, the thing physics courses rarely test.

import { useProgress } from '../contexts/ProgressContext';

// Accuracy → tier. Ordered low to high; first match from the top wins.
const TIERS = [
  { min: 85, label: 'Physicist',        color: '#4ade80', blurb: 'Your gut and the math agree. Spooky.' },
  { min: 70, label: 'Calibrated',       color: '#22d3ee', blurb: 'Your instincts track the physics well.' },
  { min: 50, label: 'Sharpening up',    color: '#6d6af8', blurb: 'Coin-flip is behind you — keep going.' },
  { min: 0,  label: 'Surprised a lot',  color: '#fbbf24', blurb: 'Physics keeps fooling you. Good — that\u2019s learning.' },
];

function tierFor(pct) {
  return TIERS.find((t) => pct >= t.min) ?? TIERS[TIERS.length - 1];
}

// A 270° sweep gauge drawn with two stacked SVG arcs.
function Gauge({ pct, color }) {
  const R = 52, C = 64;
  const START = 135;           // degrees, bottom-left
  const SWEEP = 270;           // total arc span
  const circ = 2 * Math.PI * R;
  const arcFrac = SWEEP / 360;
  const dash = circ * arcFrac;

  // Rotate the stroke so it begins at START.
  const transform = `rotate(${START} ${C} ${C})`;
  const filled = (pct / 100) * dash;

  return (
    <svg width="128" height="128" viewBox="0 0 128 128" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="intuition-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.55" />
          <stop offset="1" stopColor={color} />
        </linearGradient>
      </defs>
      {/* Track */}
      <circle
        cx={C} cy={C} r={R} fill="none"
        stroke="var(--bg-muted)" strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`} transform={transform}
      />
      {/* Filled portion */}
      <circle
        cx={C} cy={C} r={R} fill="none"
        stroke="url(#intuition-grad)" strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`} transform={transform}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      {/* Center readout */}
      <text x={C} y={C - 2} textAnchor="middle" fontSize="26" fontWeight="700"
        fill="var(--text)" fontFamily="ui-monospace, monospace">{pct}%</text>
      <text x={C} y={C + 16} textAnchor="middle" fontSize="9.5"
        fill="var(--text-muted)" letterSpacing="0.08em">ACCURACY</text>
    </svg>
  );
}

export default function IntuitionMeter() {
  const { predStats } = useProgress();
  const { correct, total } = predStats;

  // Empty / warm-up state — make the mechanic legible before there's data.
  if (total < 1) {
    return (
      <div
        className="rounded-xl border p-5 flex items-center gap-4"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(109,106,248,0.1)', border: '1px solid rgba(109,106,248,0.25)',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"
              stroke="#8b88fb" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="12" cy="12" r="3.2" fill="rgba(109,106,248,0.4)" stroke="#8b88fb" strokeWidth="1.4" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text)' }}>
            Build your Physics Intuition
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Before each experiment, Axion asks you to predict the outcome.
            Lock in a guess to start tracking how well your instincts match reality.
          </p>
        </div>
      </div>
    );
  }

  const pct  = Math.round((correct / total) * 100);
  const tier = tierFor(pct);

  return (
    <div
      className="rounded-xl border p-5 flex flex-col sm:flex-row items-center gap-5"
      style={{ borderColor: `${tier.color}40`, background: `${tier.color}0d` }}
    >
      <Gauge pct={pct} color={tier.color} />

      <div className="flex-1 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1.5"
          style={{ color: 'var(--text-muted)' }}>
          Physics Intuition
        </p>
        <p className="text-2xl font-bold tracking-tight mb-1" style={{ color: tier.color }}>
          {tier.label}
        </p>
        <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>
          {tier.blurb}
        </p>
        <div className="flex items-center justify-center sm:justify-start gap-4 text-xs"
          style={{ color: 'var(--text-muted)' }}>
          <span><span className="font-mono font-semibold" style={{ color: 'var(--text)' }}>{correct}</span> right</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span><span className="font-mono font-semibold" style={{ color: 'var(--text)' }}>{total}</span> predictions made</span>
        </div>
      </div>
    </div>
  );
}
