'use client';

export default function SimSelector({ sims, activeId, onSelect }) {
  return (
    <div
      className="flex gap-0.5 overflow-x-auto no-scrollbar"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {sims.map((sim) => {
        const isActive = sim.id === activeId;
        const isSoon   = sim.status === 'coming-soon';

        return (
          <button
            key={sim.id}
            onClick={() => !isSoon && onSelect(sim.id)}
            disabled={isSoon}
            className="sim-tab flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm whitespace-nowrap border-b-2"
            style={{
              borderBottomColor: isActive ? 'var(--accent)' : 'transparent',
              color:     isActive ? 'var(--text)' : 'var(--text-muted)',
              opacity:   isSoon ? 0.4 : 1,
              cursor:    isSoon ? 'default' : 'pointer',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
              fontWeight: isActive ? 500 : 400,
              marginBottom: '-1px',
              flexShrink: 0,
            }}
          >
            <span className="hidden xs:inline sm:inline">{sim.name}</span>
            <span className="sm:hidden" style={{ fontSize: 13 }}>
              {sim.name.split(' ')[0]}
            </span>
            {isSoon && (
              <span
                className="hidden sm:inline text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: 'var(--bg-muted)',
                  color: 'var(--text-muted)',
                  fontSize: '10px',
                  letterSpacing: '0.05em',
                }}
              >
                Soon
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
