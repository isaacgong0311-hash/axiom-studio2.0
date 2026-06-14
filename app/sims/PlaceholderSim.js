// Shown for any sim that isn't built yet.

export default function PlaceholderSim({ name = 'This simulation', tagline = '' }) {
  return (
    <div
      className="flex flex-1 items-center justify-center min-h-[420px] rounded-xl border"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
    >
      <div className="text-center max-w-xs px-6 py-10">
        <div
          className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full border mb-5"
          style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'var(--bg-muted)' }}
        >
          Coming soon
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>
          {name}
        </h2>
        {tagline && (
          <p className="text-sm" style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
            {tagline}
          </p>
        )}
      </div>
    </div>
  );
}
