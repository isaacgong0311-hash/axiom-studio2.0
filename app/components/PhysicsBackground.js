'use client';

// Ambient animated background: drifting particles linked by faint lines,
// with a few "orbiting" bodies — a quiet nod to the physics inside.
// Purely decorative, respects prefers-reduced-motion, and pauses off-screen.

import { useEffect, useRef } from 'react';

export default function PhysicsBackground({ density = 0.00009 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles = [];
    let orbiters = [];
    let rafId = null;
    let running = true;

    function resize() {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(90, Math.max(28, Math.floor(w * h * density)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.4 + 0.6,
      }));

      // A couple of slow orbiting bodies around invisible centers
      orbiters = [
        { cx: w * 0.78, cy: h * 0.28, rad: Math.min(w, h) * 0.16, a: 0, sp: 0.0009, col: '#6d6af8' },
        { cx: w * 0.2, cy: h * 0.72, rad: Math.min(w, h) * 0.11, a: Math.PI, sp: -0.0013, col: '#22d3ee' },
      ];
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      // ── Particle field + constellation links ──
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 130 * 130) {
            const alpha = (1 - Math.sqrt(d2) / 130) * 0.16;
            ctx.strokeStyle = `rgba(120,120,200,${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(150,150,230,0.35)';
        ctx.fill();
      }

      // ── Orbiting bodies with glow + faint ring ──
      for (const o of orbiters) {
        o.a += o.sp;
        const x = o.cx + Math.cos(o.a) * o.rad;
        const y = o.cy + Math.sin(o.a) * o.rad * 0.62;

        // orbit ring
        ctx.strokeStyle = 'rgba(109,106,248,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(o.cx, o.cy, o.rad, o.rad * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();

        // glow
        const g = ctx.createRadialGradient(x, y, 0, x, y, 26);
        g.addColorStop(0, o.col + '55');
        g.addColorStop(1, o.col + '00');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 26, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = o.col;
        ctx.fill();
      }

      if (running && !reduce) rafId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    if (reduce) running = false; // single static frame

    const onResize = () => { dpr = Math.min(window.devicePixelRatio || 1, 2); resize(); };
    window.addEventListener('resize', onResize);

    const onVisibility = () => {
      running = !document.hidden;
      if (running && !reduce) { rafId = requestAnimationFrame(draw); }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
