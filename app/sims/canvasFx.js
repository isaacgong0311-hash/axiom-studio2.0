// Shared 2D-canvas visual effects, kept framework-free so every sim's
// render loop can call them directly.

// ── Backdrop ──────────────────────────────────────────────────
// A deep vertical gradient plus a soft focal glow — replaces the
// old flat fill so the scene reads as a lit space rather than a box.
export function paintBackdrop(ctx, CW, CH, opts = {}) {
  const { glowX = CW * 0.5, glowY = CH * 0.42, glow = 'rgba(109,106,248,0.10)' } = opts;

  const base = ctx.createLinearGradient(0, 0, 0, CH);
  base.addColorStop(0, '#15151d');
  base.addColorStop(0.55, '#101016');
  base.addColorStop(1, '#0b0b10');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, CW, CH);

  const r = Math.max(CW, CH) * 0.7;
  const g = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, r);
  g.addColorStop(0, glow);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CW, CH);

  // Vignette to focus attention toward the center
  const v = ctx.createRadialGradient(CW / 2, CH / 2, Math.min(CW, CH) * 0.35, CW / 2, CH / 2, Math.max(CW, CH) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, CW, CH);
}

// ── Particle burst ────────────────────────────────────────────
// Mutable list of short-lived sparks. Spawn on an impact, then call
// stepBurst() each frame; it advances + draws and prunes dead ones.
export function spawnBurst(list, x, y, { color = '#ffffff', count = 16, speed = 130, spread = Math.PI * 2, dir = 0 } = {}) {
  for (let i = 0; i < count; i++) {
    const ang = dir + (Math.random() - 0.5) * spread;
    const sp = speed * (0.35 + Math.random() * 0.65);
    list.push({
      x, y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      life: 1,
      decay: 1.4 + Math.random() * 1.2,
      r: 1 + Math.random() * 2.2,
      color,
    });
  }
}

// Advances and draws every spark; mutates the list in place.
export function stepBurst(ctx, list, dt) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= p.decay * dt;
    if (p.life <= 0) { list.splice(i, 1); continue; }
    p.vx *= 0.94;
    p.vy = p.vy * 0.94 + 60 * dt; // light gravity on sparks
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    const a = Math.max(0, p.life);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * (0.6 + a * 0.6), 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(p.color, a);
    ctx.fill();
  }
  ctx.restore();
}

// Accepts #rrggbb or rgb(...) and applies an alpha.
function withAlpha(color, a) {
  if (color.startsWith('#')) {
    const n = parseInt(color.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }
  return color;
}
