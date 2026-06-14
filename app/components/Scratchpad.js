'use client';

import { useRef, useEffect, useState } from 'react';

// ── Constants ────────────────────────────────────────────────
// Internal canvas resolution — high enough for crisp writing
const CW = 1400;
const CH = 420;
const STORAGE_KEY = 'axiom-scratchpad-v1';
const MAX_UNDO = 20;

const COLORS = [
  { id: 'light',  hex: '#ddddf2', label: 'Light'  },  // default
  { id: 'indigo', hex: '#9b99ff', label: 'Indigo' },
  { id: 'cyan',   hex: '#22d3ee', label: 'Cyan'   },
  { id: 'amber',  hex: '#fbbf24', label: 'Amber'  },
];

const SIZES = [
  { id: 'S', px: 2.5 },
  { id: 'M', px: 5   },
  { id: 'L', px: 10  },
];

// ── Icons (inline SVG so there's no extra dependency) ────────
function PenIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function EraserIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20H7L3 16l10-10 7 7-3.5 3.5" />
      <path d="M6.5 17.5l3-3" />
    </svg>
  );
}

function UndoIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" />
      <path d="M3 13C5.333 7.333 10.4 4 16 4c3.6 0 6.667 1.333 9 4" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────
// isOpen: bool — controlled by SimLab.
// The component is always mounted so canvas state survives toggle.
// Visibility is toggled via CSS display so the canvas buffer is preserved.

export default function Scratchpad({ isOpen }) {
  const canvasRef = useRef(null);

  // UI state — only these need to trigger re-renders (toolbar appearance)
  const [activeTool,  setActiveTool]  = useState('pen');
  const [activeColor, setActiveColor] = useState(COLORS[0].hex);
  const [activeSize,  setActiveSize]  = useState(SIZES[1].px);
  const [canUndo,     setCanUndo]     = useState(false);

  // Refs — used inside event handlers; changes do NOT need re-renders
  const toolRef    = useRef('pen');
  const colorRef   = useRef(COLORS[0].hex);
  const sizeRef    = useRef(SIZES[1].px);
  const drawingRef = useRef(false);
  const pathRef    = useRef([]);          // points in the current stroke
  const undoRef    = useRef([]);          // ImageData snapshots for undo

  // Keep refs in sync with state
  function changeTool(t)  { setActiveTool(t);   toolRef.current  = t; }
  function changeColor(c) { setActiveColor(c);  colorRef.current = c; }
  function changeSize(s)  { setActiveSize(s);   sizeRef.current  = s; }

  // ── Load saved drawing on mount ──────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, CW, CH);
        };
        img.src = saved;
      }
    } catch (_) {}
  }, []);

  // ── Pointer event handlers ───────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Convert pointer CSS coords → canvas internal coords
    function getPos(e) {
      const r = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) * (CW / r.width),
        y: (e.clientY - r.top)  * (CH / r.height),
        // Stylus pressure (falls back to 0.5 for mouse/touch)
        pressure: e.pressure > 0 ? e.pressure : 0.5,
      };
    }

    function pushUndo() {
      const snap = ctx.getImageData(0, 0, CW, CH);
      undoRef.current = [...undoRef.current.slice(-(MAX_UNDO - 1)), snap];
      setCanUndo(true);
    }

    function persist() {
      try {
        localStorage.setItem(STORAGE_KEY, canvas.toDataURL('image/png'));
      } catch (_) {}
    }

    function onPointerDown(e) {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId); // keep events even if pointer leaves canvas
      pushUndo();
      drawingRef.current = true;
      const pos = getPos(e);
      pathRef.current = [pos];

      ctx.lineJoin = 'round';
      ctx.lineCap  = 'round';

      if (toolRef.current === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth   = 28;
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = colorRef.current;
        ctx.lineWidth   = sizeRef.current * (0.5 + pos.pressure * 0.7);
      }

      // Draw a dot on initial press (so taps leave a mark)
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    }

    function onPointerMove(e) {
      if (!drawingRef.current) return;
      e.preventDefault();

      const pos = getPos(e);
      pathRef.current.push(pos);
      const pts = pathRef.current;

      if (toolRef.current === 'eraser') {
        // Simple line segment is enough for erasing
        const prev = pts[pts.length - 2] ?? pos;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else {
        // Smooth pen stroke: midpoint quadratic Bézier interpolation
        // This makes diagonal lines look smooth even at low pointer-event rates
        ctx.lineWidth = sizeRef.current * (0.5 + pos.pressure * 0.7);
        if (pts.length >= 3) {
          const a = pts[pts.length - 3];
          const b = pts[pts.length - 2];
          const c = pts[pts.length - 1];
          ctx.beginPath();
          ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2);
          ctx.quadraticCurveTo(b.x, b.y, (b.x + c.x) / 2, (b.y + c.y) / 2);
          ctx.stroke();
        } else if (pts.length === 2) {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[1].x, pts[1].y);
          ctx.stroke();
        }
      }
    }

    function onPointerUp(e) {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      pathRef.current = [];
      ctx.globalCompositeOperation = 'source-over'; // always reset
      persist();
    }

    canvas.addEventListener('pointerdown',   onPointerDown);
    canvas.addEventListener('pointermove',   onPointerMove);
    canvas.addEventListener('pointerup',     onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown',   onPointerDown);
      canvas.removeEventListener('pointermove',   onPointerMove);
      canvas.removeEventListener('pointerup',     onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, []); // empty — all mutable values come through refs

  // ── Toolbar actions ──────────────────────────────────────
  function handleUndo() {
    if (undoRef.current.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const snap = undoRef.current[undoRef.current.length - 1];
    undoRef.current = undoRef.current.slice(0, -1);
    ctx.putImageData(snap, 0, 0);
    setCanUndo(undoRef.current.length > 0);
    try {
      localStorage.setItem(STORAGE_KEY, canvas.toDataURL('image/png'));
    } catch (_) {}
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    // Save current state first so Clear is undoable
    const snap = ctx.getImageData(0, 0, CW, CH);
    undoRef.current = [...undoRef.current.slice(-(MAX_UNDO - 1)), snap];
    setCanUndo(true);
    ctx.clearRect(0, 0, CW, CH);
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div style={{ display: isOpen ? 'block' : 'none' }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 flex-wrap"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Pen / Eraser toggle */}
        <div className="flex gap-1">
          {[
            { id: 'pen',    Icon: PenIcon,    label: 'Pen'    },
            { id: 'eraser', Icon: EraserIcon, label: 'Eraser' },
          ].map(({ id, Icon, label }) => (
            <button
              key={id}
              title={label}
              onClick={() => changeTool(id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs"
              style={{
                background:   activeTool === id ? 'var(--bg-muted)' : 'transparent',
                color:        activeTool === id ? 'var(--text)'     : 'var(--text-muted)',
                border:       activeTool === id ? '1px solid var(--border)' : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              <Icon />
              {label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0 }} />

        {/* Color swatches */}
        <div className="flex items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c.id}
              title={c.label}
              onClick={() => { changeColor(c.hex); changeTool('pen'); }}
              style={{
                width: 18, height: 18,
                borderRadius: '50%',
                background: c.hex,
                cursor: 'pointer',
                // Active ring: inner dark gap + outer color ring
                outline: activeColor === c.hex && activeTool === 'pen'
                  ? `2px solid ${c.hex}` : 'none',
                outlineOffset: 2,
                boxShadow: activeColor === c.hex && activeTool === 'pen'
                  ? `0 0 0 1px var(--bg-surface)` : 'none',
                border: 'none',
                flexShrink: 0,
              }}
            />
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0 }} />

        {/* Size dots */}
        <div className="flex items-center gap-1">
          {SIZES.map((s) => (
            <button
              key={s.id}
              title={`${s.id} (${s.px}px)`}
              onClick={() => { changeSize(s.px); changeTool('pen'); }}
              className="w-8 h-8 flex items-center justify-center rounded"
              style={{
                background: activeSize === s.px && activeTool === 'pen' ? 'var(--bg-muted)' : 'transparent',
                border:     activeSize === s.px && activeTool === 'pen' ? '1px solid var(--border)' : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width:        s.id === 'S' ? 4 : s.id === 'M' ? 7 : 12,
                  height:       s.id === 'S' ? 4 : s.id === 'M' ? 7 : 12,
                  borderRadius: '50%',
                  background:   activeTool === 'pen' ? activeColor : 'var(--text-muted)',
                }}
              />
            </button>
          ))}
        </div>

        {/* Push right */}
        <div style={{ flex: 1 }} />

        {/* Undo */}
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs"
          style={{
            color:   'var(--text-muted)',
            opacity: canUndo ? 1 : 0.3,
            cursor:  canUndo ? 'pointer' : 'not-allowed',
            background: 'transparent',
            border: '1px solid transparent',
          }}
        >
          <UndoIcon />
          Undo
        </button>

        {/* Clear */}
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs border"
          style={{
            color:       'var(--text-muted)',
            borderColor: 'var(--border)',
            background:  'transparent',
            cursor:      'pointer',
          }}
        >
          Clear
        </button>
      </div>

      {/* Drawing canvas */}
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        style={{
          width:       '100%',
          height:      'auto',
          display:     'block',
          background:  '#0f0f16',   // slightly lighter than page bg — distinct surface
          cursor:      activeTool === 'eraser' ? 'cell' : 'crosshair',
          touchAction: 'none',       // prevent page scroll while drawing on touch/stylus
        }}
      />
    </div>
  );
}
