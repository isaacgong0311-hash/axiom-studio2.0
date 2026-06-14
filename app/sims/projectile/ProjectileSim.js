'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  calcReadouts, trajectoryPoints,
  integrateTrajectory, sampleAt,
} from './physics';
import { paintBackdrop, spawnBurst, stepBurst } from '../canvasFx';
import TutorPanel from '../../components/TutorPanel';
import { useSimChallenges } from '../../hooks/useSimChallenges';
import { useScenario } from '../../contexts/ScenarioContext';
import { SCENARIOS }   from '../scenarios';

// ── Canvas geometry ──────────────────────────────────────────
const CW = 700, CH = 400;
const PAD_L = 50, PAD_R = 30, PAD_T = 35, PAD_B = 45;
const W_DRAW = CW - PAD_L - PAD_R;
const H_DRAW = CH - PAD_T - PAD_B;
const ANIM_SPEED = 1.5;
const BALL_R = 8;

// ── Planet presets ───────────────────────────────────────────
const PLANETS = [
  { id: 'earth',  label: 'Earth',  g: 9.8  },
  { id: 'moon',   label: 'Moon',   g: 1.6  },
  { id: 'mars',   label: 'Mars',   g: 3.7  },
  { id: 'custom', label: 'Custom', g: null },
];

// Drag strength presets (coefficient per unit mass, k in a = −k·|v|·v).
const DRAG_DEFAULT = 0.018;

// ── Utility: generate a reachable target distance ────────────
// Uses the *actual* (drag-aware) max range at 45° so targets stay
// achievable even with air resistance on.
function generateTarget(g, drag) {
  const maxRange = integrateTrajectory(45, 50, g, drag).range;
  return Math.round(maxRange * (0.20 + Math.random() * 0.55));
}

// ── Canvas helpers ───────────────────────────────────────────
function getScale(range, maxHeight) {
  const r = Math.max(range, 10);
  const h = Math.max(maxHeight, 3);
  return Math.min((W_DRAW * 0.88) / r, (H_DRAW * 0.82) / h);
}

function toCanvas(px, py, scale) {
  return { cx: PAD_L + px * scale, cy: CH - PAD_B - py * scale };
}

// "Nice" tick step for the distance axis (1·10ⁿ, 2·10ⁿ, 5·10ⁿ).
function niceStep(maxVal, target = 6) {
  const raw = Math.max(maxVal, 1) / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = norm >= 5 ? 5 : norm >= 2 ? 2 : 1;
  return step * mag;
}

// Draws a directed arrow from (x1,y1) to (x2,y2) with optional label.
function drawArrow(ctx, x1, y1, x2, y2, color, label) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 5) return;

  const headLen = Math.min(10, len * 0.35);
  const ang = Math.atan2(dy, dx);

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(ang - Math.PI / 6), y2 - headLen * Math.sin(ang - Math.PI / 6));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(ang + Math.PI / 6), y2 - headLen * Math.sin(ang + Math.PI / 6));
  ctx.stroke();

  if (label) {
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(label, x2 + Math.cos(ang) * 13, y2 + Math.sin(ang) * 13 + 4);
  }
}

// ── Small toggle switch component ────────────────────────────
function Toggle({ label, on, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'var(--text)' }}>{label}</span>
      <button
        onClick={onChange}
        style={{
          position: 'relative', flexShrink: 0,
          width: 36, height: 20, borderRadius: 10,
          background: on ? 'var(--accent)' : 'var(--bg-muted)',
          border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
          cursor: 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        <span style={{
          position: 'absolute', top: 2,
          left: on ? 18 : 2,
          width: 14, height: 14, borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.15s',
        }} />
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
export default function ProjectileSim() {
  const canvasRef = useRef(null);

  // ── Core simulation state ────────────────────────────────
  const [angle,    setAngle]    = useState(45);
  const [speed,    setSpeed]    = useState(25);
  const [gravity,  setGravity]  = useState(9.8);
  const [gravPreset, setGravPreset] = useState('earth');
  const [launched, setLaunched] = useState(false);

  // ── Air resistance ────────────────────────────────────────
  const [airOn, setAirOn]   = useState(false);
  const airOnRef            = useRef(false);
  const [drag,  setDrag]    = useState(DRAG_DEFAULT);

  // ── Feature toggles — kept in refs so toggling mid-animation
  //    doesn't restart the RAF loop; only state is for toolbar UI
  const [showVectors, setShowVectors] = useState(false);
  const showVectorsRef = useRef(false);

  const [targetMode, setTargetMode] = useState(false);
  const targetModeRef = useRef(false);

  const [targetX, setTargetX] = useState(null);
  const targetXRef = useRef(null);

  // ── Result state ─────────────────────────────────────────
  const [hitResult,    setHitResult]    = useState(null); // null | 'hit' | 'miss'
  const [landingError, setLandingError] = useState(0);

  // ── Physics result (drag-aware) — memoized so sliders stay snappy.
  const effectiveDrag = airOn ? drag : 0;
  const sim = useMemo(
    () => integrateTrajectory(angle, speed, gravity, effectiveDrag),
    [angle, speed, gravity, effectiveDrag],
  );
  const readouts = {
    range:        sim.range,
    maxHeight:    sim.maxHeight,
    timeOfFlight: sim.timeOfFlight,
    landingSpeed: sim.landingSpeed,
  };
  // Vacuum reference (used for the ghost curve + % range lost to drag).
  const vac = useMemo(() => calcReadouts(angle, speed, gravity), [angle, speed, gravity]);
  const rangeLostPct = airOn && vac.range > 0
    ? Math.round((1 - sim.range / vac.range) * 100)
    : 0;

  // ── Handlers ─────────────────────────────────────────────
  function handleReset() {
    setLaunched(false);
    setHitResult(null);
    setLandingError(0);
  }

  function handleGravityChange(newG, preset) {
    setGravity(newG);
    setGravPreset(preset);
    if (launched) handleReset();
    if (targetModeRef.current) {
      const t = generateTarget(newG, airOnRef.current ? drag : 0);
      setTargetX(t); targetXRef.current = t;
      setHitResult(null); setLandingError(0);
    }
  }

  function handleToggleAir() {
    const next = !airOn;
    setAirOn(next);
    airOnRef.current = next;
    if (launched) handleReset();
    if (targetModeRef.current) {
      const t = generateTarget(gravity, next ? drag : 0);
      setTargetX(t); targetXRef.current = t;
      setHitResult(null); setLandingError(0);
    }
  }

  function handleToggleVectors() {
    const next = !showVectors;
    setShowVectors(next);
    showVectorsRef.current = next;
  }

  function handleToggleTargetMode() {
    const next = !targetMode;
    setTargetMode(next);
    targetModeRef.current = next;
    if (next) {
      const t = generateTarget(gravity, airOnRef.current ? drag : 0);
      setTargetX(t); targetXRef.current = t;
      setHitResult(null); setLandingError(0);
    } else {
      setTargetX(null); targetXRef.current = null;
      setHitResult(null); setLandingError(0);
    }
  }

  function handleNewTarget() {
    const t = generateTarget(gravity, airOnRef.current ? drag : 0);
    setTargetX(t); targetXRef.current = t;
    handleReset();
  }

  // ── Scenario subscription ────────────────────────────────
  const { pendingScenario, clearScenario } = useScenario();
  useEffect(() => {
    if (!pendingScenario) return;
    const s = SCENARIOS[pendingScenario];
    if (!s || s.simId !== 'projectile') return;
    const v = s.values;
    if (v.angle     !== undefined) setAngle(v.angle);
    if (v.speed     !== undefined) setSpeed(v.speed);
    if (v.gravity   !== undefined) setGravity(v.gravity);
    if (v.gravPreset !== undefined) setGravPreset(v.gravPreset);
    setLaunched(false); setHitResult(null); setLandingError(0);
    clearScenario();
  }, [pendingScenario, clearScenario]);

  // ── Canvas drawing + animation ───────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const dragK = airOnRef.current ? drag : 0;
    const traj = integrateTrajectory(angle, speed, gravity, dragK);
    const { range, maxHeight, timeOfFlight: T, samples } = traj;
    const vacRef = calcReadouts(angle, speed, gravity);

    // Fit both the actual path and (when shown) the vacuum ghost.
    const rangeFit  = airOnRef.current ? Math.max(range, vacRef.range)     : range;
    const heightFit = airOnRef.current ? Math.max(maxHeight, vacRef.maxHeight) : maxHeight;
    const scale = getScale(rangeFit, heightFit);
    const tc = (px, py) => toCanvas(px, py, scale);
    const groundY = CH - PAD_B;

    // Apex (highest sample) — drives the apex-ping ring.
    let apexT = 0, apexY = 0;
    for (const s of samples) if (s.y > apexY) { apexY = s.y; apexT = s.t; }

    const rad = (angle * Math.PI) / 180;

    // ── Sub-draw functions ─────────────────────────────────
    function drawGrid() {
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let x = PAD_L; x <= CW - PAD_R; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, groundY); ctx.stroke();
      }
      for (let y = groundY; y >= PAD_T; y -= 55) {
        ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(CW - PAD_R, y); ctx.stroke();
      }
    }

    function drawGround() {
      // Soft horizon glow sitting on the ground line.
      const hg = ctx.createLinearGradient(0, groundY - 18, 0, groundY);
      hg.addColorStop(0, 'rgba(109,106,248,0)');
      hg.addColorStop(1, 'rgba(109,106,248,0.07)');
      ctx.fillStyle = hg;
      ctx.fillRect(PAD_L, groundY - 18, CW - PAD_L - PAD_R, 18);

      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(PAD_L, groundY);
      ctx.lineTo(CW - PAD_R, groundY);
      ctx.stroke();
    }

    // Distance axis: nicely-spaced ticks with metre labels.
    function drawAxis() {
      const step = niceStep(rangeFit);
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      for (let m = step; ; m += step) {
        const { cx } = tc(m, 0);
        if (cx > CW - PAD_R - 4) break;
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, groundY); ctx.lineTo(cx, groundY + 4); ctx.stroke();
        ctx.fillStyle = 'rgba(123,127,168,0.7)';
        ctx.fillText(`${m}`, cx, groundY + 16);
      }
      ctx.textAlign = 'left';
    }

    // The launch cannon — a barrel pinned at the origin, angled to match.
    function drawBarrel() {
      const { cx: ox, cy: oy } = tc(0, 0);
      const len = 30, wid = 11;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(-rad);
      // Barrel body
      const bg = ctx.createLinearGradient(0, -wid / 2, 0, wid / 2);
      bg.addColorStop(0, '#3a3a52');
      bg.addColorStop(0.5, '#52527a');
      bg.addColorStop(1, '#2a2a3e');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(-2, -wid / 2, len, wid, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(109,106,248,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      // Pivot hub
      ctx.beginPath();
      ctx.arc(ox, oy, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#52527a';
      ctx.fill();
      ctx.strokeStyle = 'rgba(109,106,248,0.6)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    function drawLandingMarker() {
      if (range < 0.5) return;
      const { cx } = tc(range, 0);
      if (cx > PAD_L && cx < CW - PAD_R) {
        ctx.beginPath();
        ctx.arc(cx, groundY, 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(109,106,248,0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    function drawTarget(now) {
      const tgt = targetXRef.current;
      if (tgt === null) return;
      const { cx: tx } = tc(tgt, 0);

      if (tx > CW - PAD_R + 5) {
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(239,68,68,0.65)';
        ctx.textAlign = 'right';
        ctx.fillText(`Target: ${tgt.toFixed(0)} m  →`, CW - PAD_R - 4, groundY - 10);
        ctx.textAlign = 'left';
        return;
      }

      // Pulsing bullseye — outer ring breathes with time.
      const pulse = 0.5 + 0.5 * Math.sin(now * 3);
      ctx.beginPath();
      ctx.arc(tx, groundY, 22 + pulse * 5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(239,68,68,${0.15 + pulse * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      [[22, 0.4], [12, 0.6], [4, 1.0]].forEach(([r, alpha]) => {
        ctx.beginPath();
        ctx.arc(tx, groundY, r, 0, Math.PI * 2);
        if (r === 4) { ctx.fillStyle = `rgba(239,68,68,${alpha})`; ctx.fill(); }
        else { ctx.strokeStyle = `rgba(239,68,68,${alpha})`; ctx.lineWidth = 1.5; ctx.stroke(); }
      });

      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(239,68,68,0.75)';
      ctx.textAlign = 'center';
      ctx.fillText(`${tgt.toFixed(0)} m`, tx, groundY - 30);
      ctx.textAlign = 'left';
    }

    // Predicted full path (pre-launch), sampled evenly along the real curve.
    function drawArc(srcSamples, color, dash) {
      const end = srcSamples[srcSamples.length - 1]?.t ?? 0;
      if (end <= 0) return;
      const N = 90;
      ctx.setLineDash(dash);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const p = sampleAt(srcSamples, (i / N) * end);
        const { cx, cy } = tc(p.x, p.y);
        i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Glowing comet trail: brightens toward the leading head.
    function drawComet(tEnd) {
      const end = Math.min(tEnd, T);
      const N = 72;
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const p = sampleAt(samples, (i / N) * end);
        pts.push(tc(p.x, p.y));
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (let i = 1; i < pts.length; i++) {
        const f = i / pts.length;          // 0 tail → 1 head
        // wide soft glow
        ctx.strokeStyle = `rgba(109,106,248,${(f * 0.25).toFixed(3)})`;
        ctx.lineWidth = 7 * f + 1;
        ctx.beginPath();
        ctx.moveTo(pts[i - 1].cx, pts[i - 1].cy);
        ctx.lineTo(pts[i].cx, pts[i].cy);
        ctx.stroke();
      }
      ctx.restore();
      // bright core
      ctx.lineCap = 'round';
      for (let i = 1; i < pts.length; i++) {
        const f = i / pts.length;
        ctx.strokeStyle = `rgba(196,194,255,${(0.25 + f * 0.65).toFixed(3)})`;
        ctx.lineWidth = 2.4 * f + 0.6;
        ctx.beginPath();
        ctx.moveTo(pts[i - 1].cx, pts[i - 1].cy);
        ctx.lineTo(pts[i].cx, pts[i].cy);
        ctx.stroke();
      }
    }

    function drawBall(p, vel) {
      const { cx: bx, cy: by } = tc(p.x, p.y);
      const spd = Math.hypot(vel.vx, vel.vy);

      // Shadow on ground (shrinks + fades as ball rises).
      if (p.y > 0.3 && maxHeight > 0) {
        const hf = Math.min(1, p.y / maxHeight);
        const alpha  = 0.5 * (1 - hf * 0.8);
        const shadowX = tc(p.x, 0).cx;
        const radX = BALL_R * Math.max(0.4, 1 - hf * 0.55);
        ctx.beginPath();
        ctx.ellipse(shadowX, groundY, radX * 1.8, 3.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,0,0,${alpha.toFixed(2)})`;
        ctx.fill();
      }

      // Motion smear — a translucent streak opposite the velocity.
      if (spd > 4) {
        const dirX = vel.vx / spd, dirY = vel.vy / spd;
        const smear = Math.min(14, spd * 0.4);
        const tailX = bx - dirX * smear, tailY = by + dirY * smear;
        const sg = ctx.createLinearGradient(tailX, tailY, bx, by);
        sg.addColorStop(0, 'rgba(109,106,248,0)');
        sg.addColorStop(1, 'rgba(109,106,248,0.35)');
        ctx.strokeStyle = sg;
        ctx.lineWidth = BALL_R * 1.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tailX, tailY); ctx.lineTo(bx, by); ctx.stroke();
      }

      // Soft ambient glow.
      ctx.beginPath();
      ctx.arc(bx, by, BALL_R + 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(109,106,248,0.15)';
      ctx.fill();

      // 3-D shaded sphere (off-center highlight = directional light).
      const hlx = bx - BALL_R * 0.32, hly = by - BALL_R * 0.32;
      const grad = ctx.createRadialGradient(hlx, hly, BALL_R * 0.05, bx, by, BALL_R);
      grad.addColorStop(0,    'rgba(255,255,255,0.92)');
      grad.addColorStop(0.18, '#c4c2ff');
      grad.addColorStop(0.55, '#6d6af8');
      grad.addColorStop(1,    '#2a2870');
      ctx.beginPath();
      ctx.arc(bx, by, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    function drawVectors(p, vel) {
      const { cx: bx, cy: by } = tc(p.x, p.y);
      const VS = 70 / Math.max(speed, 1);
      drawArrow(ctx, bx, by, bx + vel.vx * VS, by, '#22d3ee', 'vₓ');
      drawArrow(ctx, bx, by, bx, by - vel.vy * VS, '#fbbf24', 'vy');
    }

    // Floating HUD chip beside the ball: live speed + height.
    function drawHud(p, vel) {
      const { cx: bx, cy: by } = tc(p.x, p.y);
      const spd = Math.hypot(vel.vx, vel.vy);
      const lines = [`${spd.toFixed(1)} m/s`, `h ${p.y.toFixed(1)} m`];
      ctx.font = '10px ui-monospace, monospace';
      const w = 60, h = 30;
      let lx = bx + 14, ly = by - h - 6;
      if (lx + w > CW - PAD_R) lx = bx - w - 14;
      if (ly < PAD_T) ly = by + 10;
      ctx.fillStyle = 'rgba(13,13,18,0.72)';
      ctx.beginPath(); ctx.roundRect(lx, ly, w, h, 5); ctx.fill();
      ctx.strokeStyle = 'rgba(109,106,248,0.3)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#c4c2ff'; ctx.textAlign = 'left';
      ctx.fillText(lines[0], lx + 7, ly + 12);
      ctx.fillStyle = 'rgba(123,127,168,0.95)';
      ctx.fillText(lines[1], lx + 7, ly + 24);
    }

    // Expanding rings (apex ping + landing shockwave).
    const rings = [];
    function spawnRing(x, y, color, maxR) { rings.push({ x, y, r: 4, maxR, life: 1, color }); }
    function stepRings(dt) {
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.life -= dt * 1.6;
        ring.r += (ring.maxR - ring.r) * Math.min(1, dt * 6);
        if (ring.life <= 0) { rings.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${ring.color},${(ring.life * 0.6).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // ── Master frame ──────────────────────────────────────
    function drawFrame(t, now) {
      paintBackdrop(ctx, CW, CH, { glowY: CH * 0.5 });
      drawGrid();
      drawGround();
      drawAxis();
      drawLandingMarker();
      if (targetModeRef.current) drawTarget(now);
      // Vacuum ghost (only meaningful with air on).
      if (airOnRef.current) drawArc(integrateTrajectory(angle, speed, gravity, 0).samples, 'rgba(123,127,168,0.28)', [3, 4]);
      drawArc(samples, 'rgba(109,106,248,0.28)', [5, 5]);
      drawBarrel();
      if (t > 0) {
        drawComet(t);
        const p = sampleAt(samples, Math.min(t, T));
        drawBall(p, p);
        if (showVectorsRef.current) drawVectors(p, p);
        drawHud(p, p);
      } else {
        drawBall({ x: 0, y: 0 }, { vx: 0, vy: 0 });
      }
    }

    // ── Static / ambient (pre-launch) ─────────────────────
    // Keep a light RAF running so the target pulses and barrel sits live.
    if (!launched || T <= 0) {
      let id;
      const ambient = (ts) => {
        drawFrame(0, ts / 1000);
        id = requestAnimationFrame(ambient);
      };
      id = requestAnimationFrame(ambient);
      return () => cancelAnimationFrame(id);
    }

    // ── Launch animation loop ─────────────────────────────
    let simTime = 0, lastTs = null, rafId;
    const sparks = [];
    let landed = false, apexFired = false, muzzleFired = false;

    function step(ts) {
      if (!lastTs) lastTs = ts;
      const realDt = Math.min((ts - lastTs) / 1000, 0.05);
      const dt = realDt * ANIM_SPEED;
      lastTs = ts;
      simTime += dt;

      const tNow = Math.min(simTime, T);
      drawFrame(tNow, ts / 1000);

      // Muzzle flash on the very first frame.
      if (!muzzleFired) {
        muzzleFired = true;
        const o = tc(0, 0);
        spawnBurst(sparks, o.cx, o.cy, {
          color: '#fbbf24', count: 16, speed: 180, dir: -rad, spread: Math.PI * 0.5,
        });
      }

      // Apex ping when the ball crests.
      if (!apexFired && simTime >= apexT && apexT > 0) {
        apexFired = true;
        const ap = sampleAt(samples, apexT);
        const c = tc(ap.x, ap.y);
        spawnRing(c.cx, c.cy, '251,191,36', 26);
      }

      // Drag streaks — little air-shear sparks shed off a fast ball.
      if (airOnRef.current && simTime < T) {
        const p = sampleAt(samples, tNow);
        const spd = Math.hypot(p.vx, p.vy);
        if (spd > 8 && Math.random() < 0.6) {
          const c = tc(p.x, p.y);
          spawnBurst(sparks, c.cx, c.cy, {
            color: '#22d3ee', count: 1, speed: 26,
            dir: Math.atan2(p.vy, -p.vx), spread: 0.8,
          });
        }
      }

      // Landing: dust kick + shockwave + target eval.
      if (!landed && simTime >= T) {
        landed = true;
        const land = tc(range, 0);
        if (land.cx > PAD_L && land.cx < CW - PAD_R) {
          spawnBurst(sparks, land.cx, groundY, {
            color: '#c4c2ff', count: 24, speed: 160, dir: -Math.PI / 2, spread: Math.PI * 0.85,
          });
          spawnRing(land.cx, groundY, '196,194,255', 34);
        }
        if (targetModeRef.current && targetXRef.current !== null) {
          const tol = Math.max(2.5, targetXRef.current * 0.03);
          const err = Math.abs(range - targetXRef.current);
          setLandingError(err);
          setHitResult(err <= tol ? 'hit' : 'miss');
        }
      }

      stepRings(realDt);
      stepBurst(ctx, sparks, realDt);

      if (simTime < T || sparks.length > 0 || rings.length > 0) {
        rafId = requestAnimationFrame(step);
      } else {
        // Settle on a clean final frame, then idle-pulse the target.
        const idle = (ts2) => { drawFrame(T, ts2 / 1000); rafId = requestAnimationFrame(idle); };
        rafId = requestAnimationFrame(idle);
      }
    }

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angle, speed, gravity, drag, airOn, launched]);

  // ── Challenge detection ───────────────────────────────────
  useSimChallenges('projectile', {
    hitResult,
    launched,
    angle,
    gravity,
    range: readouts.range,
  });

  // ── JSX ───────────────────────────────────────────────────
  const simState = {
    simId:       'projectile',
    angle:       `${angle}°`,
    speed:       `${speed} m/s`,
    gravity:     `${gravity} m/s²`,
    airResistance: airOn ? `on (k=${drag.toFixed(3)})` : 'off (vacuum)',
    predictedRange:      `${readouts.range.toFixed(1)} m`,
    predictedMaxHeight:  `${readouts.maxHeight.toFixed(1)} m`,
    predictedFlightTime: `${readouts.timeOfFlight.toFixed(2)} s`,
    landingSpeed:        `${readouts.landingSpeed.toFixed(1)} m/s`,
    ...(airOn ? { rangeLostToDrag: `${rangeLostPct}%` } : {}),
    launched,
    ...(targetMode && targetX !== null ? { targetRange: `${targetX} m`, hitResult: hitResult ?? 'not yet run' } : {}),
  };

  return (
    <div className="flex flex-col gap-5">
    <div className="flex flex-col lg:flex-row gap-5">

      {/* Canvas */}
      <div className="flex-1 rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <canvas ref={canvasRef} width={CW} height={CH}
          style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-72 flex flex-col gap-4 flex-shrink-0">

        {/* ── Controls ─── */}
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: 'var(--text-muted)' }}>
            Controls
          </p>

          <div className="space-y-5">
            {/* Angle */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm" style={{ color: 'var(--text)' }}>Launch angle</span>
                <span className="text-sm font-mono" style={{ color: 'var(--accent)' }}>{angle}°</span>
              </div>
              <input type="range" min={1} max={89} value={angle} disabled={launched}
                onChange={(e) => { setAngle(Number(e.target.value)); if (launched) handleReset(); }}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: launched ? 'not-allowed' : 'pointer' }} />
              <div className="flex justify-between mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>1°</span><span>89°</span>
              </div>
            </div>

            {/* Speed */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm" style={{ color: 'var(--text)' }}>Initial speed</span>
                <span className="text-sm font-mono" style={{ color: 'var(--accent)' }}>{speed} m/s</span>
              </div>
              <input type="range" min={5} max={50} value={speed} disabled={launched}
                onChange={(e) => { setSpeed(Number(e.target.value)); if (launched) handleReset(); }}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: launched ? 'not-allowed' : 'pointer' }} />
              <div className="flex justify-between mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>5 m/s</span><span>50 m/s</span>
              </div>
            </div>
          </div>

          {/* Planet presets */}
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>
              Gravity
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {PLANETS.map((p) => (
                <button key={p.id}
                  onClick={() => handleGravityChange(p.g ?? gravity, p.id)}
                  className="py-1.5 rounded-lg text-xs border transition-colors"
                  style={{
                    background:   gravPreset === p.id ? 'var(--accent)' : 'transparent',
                    color:        gravPreset === p.id ? '#fff' : 'var(--text-muted)',
                    borderColor:  gravPreset === p.id ? 'var(--accent)' : 'var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  {p.id !== 'custom' ? `${p.label} ${p.g}` : 'Custom'}
                </button>
              ))}
            </div>

            {/* Custom gravity slider */}
            {gravPreset === 'custom' && (
              <div className="mt-3">
                <div className="flex justify-between mb-1.5 text-sm">
                  <span style={{ color: 'var(--text)' }}>Gravity</span>
                  <span className="font-mono" style={{ color: 'var(--accent)' }}>{gravity.toFixed(1)} m/s²</span>
                </div>
                <input type="range" min={0.5} max={25} step={0.1} value={gravity}
                  onChange={(e) => handleGravityChange(Number(e.target.value), 'custom')}
                  style={{ width: '100%', accentColor: 'var(--accent)' }} />
                <div className="flex justify-between mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>0.5</span><span>25 m/s²</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Options ─── */}
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Options
          </p>
          <Toggle label="Velocity vectors" on={showVectors} onChange={handleToggleVectors} />
          <Toggle label="Target challenge"  on={targetMode}  onChange={handleToggleTargetMode} />
          <Toggle label="Air resistance"    on={airOn}       onChange={handleToggleAir} />

          {/* Drag strength — only when air resistance is engaged */}
          {airOn && (
            <div className="pt-1">
              <div className="flex justify-between mb-1.5 text-sm">
                <span style={{ color: 'var(--cyan)' }}>Drag strength</span>
                <span className="font-mono text-xs" style={{ color: 'var(--cyan)' }}>k = {drag.toFixed(3)}</span>
              </div>
              <input type="range" min={0.004} max={0.05} step={0.002} value={drag}
                onChange={(e) => { setDrag(Number(e.target.value)); if (launched) handleReset(); }}
                style={{ width: '100%', accentColor: 'var(--cyan)' }} />
              <p className="text-xs mt-1.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
                Quadratic drag, solved live with RK4. The grey dashed line is the
                vacuum path for comparison.
              </p>
            </div>
          )}
        </div>

        {/* ── Readouts ─── */}
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
            Readouts
          </p>
          <div className="space-y-3.5">
            {[
              { label: 'Range',          value: readouts.range.toFixed(1),        unit: 'm' },
              { label: 'Max height',     value: readouts.maxHeight.toFixed(1),    unit: 'm' },
              { label: 'Time of flight', value: readouts.timeOfFlight.toFixed(2), unit: 's' },
              { label: 'Landing speed',  value: readouts.landingSpeed.toFixed(1), unit: 'm/s' },
            ].map(({ label, value, unit }) => (
              <div key={label} className="flex justify-between items-baseline">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span className="font-mono text-sm" style={{ color: 'var(--text)' }}>
                  {value}<span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>{unit}</span>
                </span>
              </div>
            ))}

            {/* Drag impact — how much range air resistance stole */}
            {airOn && (
              <div className="flex justify-between items-baseline pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--cyan)' }}>Range lost to drag</span>
                <span className="font-mono text-sm" style={{ color: 'var(--cyan)' }}>
                  {rangeLostPct}<span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>%</span>
                </span>
              </div>
            )}

            {/* Target row — shown when target mode is on */}
            {targetMode && targetX !== null && (
              <div className="flex justify-between items-baseline pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm" style={{ color: '#ef4444' }}>Target</span>
                <span className="font-mono text-sm" style={{ color: '#ef4444' }}>
                  {targetX}<span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>m</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Buttons ─── */}
        <div className="flex gap-3">
          <button onClick={() => setLaunched(true)} disabled={launched}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--accent)', color: '#fff', opacity: launched ? 0.4 : 1, cursor: launched ? 'not-allowed' : 'pointer' }}>
            Launch
          </button>
          <button onClick={handleReset}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'transparent', cursor: 'pointer' }}>
            Reset
          </button>
        </div>

        {/* New Target button */}
        {targetMode && (
          <button onClick={handleNewTarget}
            className="w-full py-2.5 rounded-lg text-sm font-medium border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'transparent', cursor: 'pointer' }}>
            New Target
          </button>
        )}

        {/* Hit / Miss result */}
        {hitResult && (
          <div className="rounded-lg px-4 py-3 text-sm text-center font-medium"
            style={{
              background:  hitResult === 'hit' ? 'rgba(34,197,94,0.08)'  : 'rgba(239,68,68,0.08)',
              border:      `1px solid ${hitResult === 'hit' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              color:       hitResult === 'hit' ? '#4ade80' : '#f87171',
            }}>
            {hitResult === 'hit'
              ? 'Hit! Great shot!'
              : `Missed — ${landingError.toFixed(1)} m off`}
          </div>
        )}

      </div>
    </div>

    <TutorPanel
      simId="projectile"
      simState={simState}
      hasResult={launched}
      rawState={{ hitResult, launched, angle, gravity, range: readouts.range, airOn, landingSpeed: readouts.landingSpeed }}
    />
    </div>
  );
}
