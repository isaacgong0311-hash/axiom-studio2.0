'use client';

import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { orbitalEnergy } from './physics';

// ── Constants ─────────────────────────────────────────────────
const STAR_RADIUS   = 2.5;
const PLANET_RADIUS = 0.85;
const MAX_TRAIL     = 900;   // ~15s of trail at 60fps — enough for one full orbit
const CRASH_DIST    = STAR_RADIUS + PLANET_RADIUS * 0.5;
const ESCAPE_DIST   = 220;
const SUB_STEPS     = 8;

// Trail colours per status — stored as [r, g, b] in [0,1]
const TRAIL_COLORS = {
  ready:    [0.427, 0.416, 0.973], // #6d6af8 accent
  orbiting: [0.290, 0.871, 0.502], // #4ade80 green
  escaping: [0.984, 0.573, 0.235], // #fb923c orange
  crashed:  [0.973, 0.443, 0.443], // #f87171 red
  escaped:  [0.655, 0.545, 0.984], // #a78bfa purple
};

// ── Scene component ───────────────────────────────────────────
function OrbitalScene({ starMass, initialDistance, initialSpeed, running, resetKey, onUpdate }) {
  // Mesh refs
  const planetRef       = useRef();
  const planetMatRef    = useRef();
  const crashFlashRef   = useRef();
  const crashFlashMatRef = useRef();
  const flashLightRef   = useRef();

  // Physics refs
  const posRef     = useRef([initialDistance, 0, 0]);
  const velRef     = useRef([0, 0, -initialSpeed]);
  const trailRef   = useRef([]);       // [{pos:[x,y,z], col:[r,g,b]}]
  const statusRef  = useRef('ready');
  const prevStatusRef = useRef('ready');
  const frameRef   = useRef(0);
  const crashAnimRef = useRef({ active: false, t: 0 });

  // Prop mirrors → keep stale-closure-free in useFrame
  const runningRef  = useRef(running);
  const starMassRef = useRef(starMass);
  const initDistRef = useRef(initialDistance);
  useEffect(() => { runningRef.current  = running;          }, [running]);
  useEffect(() => { starMassRef.current = starMass;         }, [starMass]);
  useEffect(() => { initDistRef.current = initialDistance;  }, [initialDistance]);

  // ── Trail geometry — vertex-coloured, additive blending ───
  const { trailLine, trailPosBuf, trailColBuf } = useMemo(() => {
    const posBuf = new Float32Array(MAX_TRAIL * 3);
    const posAttr = new THREE.BufferAttribute(posBuf, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);

    const colBuf = new Float32Array(MAX_TRAIL * 3);
    const colAttr = new THREE.BufferAttribute(colBuf, 3);
    colAttr.setUsage(THREE.DynamicDrawUsage);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', posAttr);
    geom.setAttribute('color',    colAttr);
    geom.setDrawRange(0, 0);

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      opacity:      0.82,
      transparent:  true,
      blending:     THREE.AdditiveBlending,  // free glow on dark background
      depthWrite:   false,
    });

    return { trailLine: new THREE.Line(geom, mat), trailPosBuf: posBuf, trailColBuf: colBuf };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    trailLine.geometry.dispose();
    trailLine.material.dispose();
  }, [trailLine]);

  // ── Reset ────────────────────────────────────────────────
  useEffect(() => {
    posRef.current     = [initialDistance, 0, 0];
    velRef.current     = [0, 0, -initialSpeed];
    trailRef.current   = [];
    statusRef.current  = 'ready';
    prevStatusRef.current = 'ready';
    frameRef.current   = 0;
    crashAnimRef.current = { active: false, t: 0 };

    if (planetRef.current) {
      planetRef.current.position.set(initialDistance, 0, 0);
      planetRef.current.visible = true;
      planetRef.current.scale.setScalar(1);
    }
    if (planetMatRef.current)   planetMatRef.current.opacity = 1;
    if (crashFlashRef.current)  crashFlashRef.current.visible = false;
    if (flashLightRef.current)  flashLightRef.current.intensity = 0;

    trailLine.geometry.setDrawRange(0, 0);
    onUpdate(initialSpeed, initialDistance, 'ready');
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Main loop ─────────────────────────────────────────────
  useFrame((_, delta) => {

    // ─ 1. Visual animations — run even when physics is paused ─
    const ca = crashAnimRef.current;
    if (ca.active) {
      // Expanding flash sphere
      if (crashFlashRef.current)
        crashFlashRef.current.scale.setScalar(STAR_RADIUS * 0.5 + ca.t * STAR_RADIUS * 8);
      if (crashFlashMatRef.current)
        crashFlashMatRef.current.opacity = Math.max(0, 0.72 - ca.t * 1.15);
      // Brief white light pulse from the star
      if (flashLightRef.current)
        flashLightRef.current.intensity = Math.max(0, 4500 * (1 - ca.t * 2.8));

      ca.t += delta;
      if (ca.t >= 0.65) {
        ca.active = false;
        if (crashFlashRef.current) crashFlashRef.current.visible = false;
        if (flashLightRef.current) flashLightRef.current.intensity = 0;
      }
    }

    // ─ 2. Physics gate ─────────────────────────────────────
    const running = runningRef.current;
    const status  = statusRef.current;
    if (!running || status === 'crashed' || status === 'escaped') return;

    // ─ 3. Velocity Verlet integration (unchanged) ──────────
    const GM = starMassRef.current;
    const dt = Math.min(delta, 0.05) / SUB_STEPS;

    let [px, py, pz] = posRef.current;
    let [vx, vy, vz] = velRef.current;

    for (let s = 0; s < SUB_STEPS; s++) {
      const r2  = px*px + py*py + pz*pz;
      const r   = Math.sqrt(r2);
      const aM  = GM / r2;
      const ax  = -aM*px/r,  ay = -aM*py/r,  az = -aM*pz/r;

      const npx = px + vx*dt + 0.5*ax*dt*dt;
      const npy = py + vy*dt + 0.5*ay*dt*dt;
      const npz = pz + vz*dt + 0.5*az*dt*dt;

      const r2n = npx*npx + npy*npy + npz*npz;
      const rn  = Math.sqrt(r2n);
      const aMn = GM / r2n;
      const ax2 = -aMn*npx/rn, ay2 = -aMn*npy/rn, az2 = -aMn*npz/rn;

      vx = vx + 0.5*(ax+ax2)*dt;
      vy = vy + 0.5*(ay+ay2)*dt;
      vz = vz + 0.5*(az+az2)*dt;
      px = npx; py = npy; pz = npz;
    }

    posRef.current = [px, py, pz];
    velRef.current = [vx, vy, vz];
    if (planetRef.current) planetRef.current.position.set(px, py, pz);

    // ─ 4. Status determination ─────────────────────────────
    const dist   = Math.sqrt(px*px + py*py + pz*pz);
    const speed  = Math.sqrt(vx*vx + vy*vy + vz*vz);
    const energy = orbitalEnergy(speed, dist, GM);

    const prevStatus = prevStatusRef.current;

    if (dist < CRASH_DIST) {
      statusRef.current = 'crashed';
      if (planetRef.current) planetRef.current.visible = false;
    } else if (dist > ESCAPE_DIST && energy >= 0) {
      statusRef.current = 'escaped';
    } else {
      statusRef.current = energy < 0 ? 'orbiting' : 'escaping';
    }

    // ─ 5. Status-transition effects ────────────────────────
    if (statusRef.current !== prevStatus) {
      if (statusRef.current === 'crashed') {
        // Kick off impact flash
        crashAnimRef.current = { active: true, t: 0 };
        if (crashFlashRef.current) {
          crashFlashRef.current.visible = true;
          crashFlashRef.current.scale.setScalar(STAR_RADIUS * 0.5);
        }
      }
      prevStatusRef.current = statusRef.current;
    }

    // ─ 6. Planet escape fade (shrink + fade as it flies away) ─
    if (statusRef.current === 'escaping') {
      const d0 = initDistRef.current;
      const fadeStart = d0 * 1.6;
      const fadeEnd   = d0 * 5.0;
      const t = Math.min(1, Math.max(0, (dist - fadeStart) / (fadeEnd - fadeStart)));
      if (planetMatRef.current) planetMatRef.current.opacity = 1 - t * 0.88;
      if (planetRef.current)    planetRef.current.scale.setScalar(Math.max(0.08, 1 - t * 0.70));
    }

    // ─ 7. Trail — record position + status colour ──────────
    const col = TRAIL_COLORS[statusRef.current] ?? TRAIL_COLORS.ready;
    const trail = trailRef.current;
    trail.push({ pos: [px, py, pz], col });
    if (trail.length > MAX_TRAIL) trail.shift();

    // Update geometry buffers imperatively
    const count = trail.length;
    for (let i = 0; i < count; i++) {
      const p = trail[i].pos;
      const c = trail[i].col;
      const fade = (i + 1) / count;     // oldest ≈ 0 → newest = 1
      trailPosBuf[i*3]   = p[0];
      trailPosBuf[i*3+1] = p[1];
      trailPosBuf[i*3+2] = p[2];
      trailColBuf[i*3]   = c[0] * fade;
      trailColBuf[i*3+1] = c[1] * fade;
      trailColBuf[i*3+2] = c[2] * fade;
    }
    trailLine.geometry.attributes.position.needsUpdate = true;
    trailLine.geometry.attributes.color.needsUpdate    = true;
    trailLine.geometry.setDrawRange(0, count);

    // ─ 8. Readout push (~10fps) ────────────────────────────
    frameRef.current++;
    if (frameRef.current % 6 === 0) {
      onUpdate(speed, dist, statusRef.current);
    }
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.12} />
      <pointLight position={[0, 0, 0]} intensity={1200} color="#ffe888" decay={2} />
      {/* Impact flash light — normally off, pulses on crash */}
      <pointLight ref={flashLightRef} position={[0, 0, 0]} intensity={0} color="#ffffff" decay={2} />

      {/* Starfield */}
      <Stars radius={280} depth={80} count={3500} factor={3.5} saturation={0} fade />

      {/* Star */}
      <group>
        <mesh>
          <sphereGeometry args={[STAR_RADIUS, 48, 48]} />
          <meshStandardMaterial color="#fff8cc" emissive="#ff7700" emissiveIntensity={6} roughness={0.4} metalness={0} />
        </mesh>
        <mesh>
          <sphereGeometry args={[STAR_RADIUS * 1.65, 16, 16]} />
          <meshBasicMaterial color="#ff8800" transparent opacity={0.09} depthWrite={false} side={THREE.BackSide} />
        </mesh>
        <mesh>
          <sphereGeometry args={[STAR_RADIUS * 2.7, 16, 16]} />
          <meshBasicMaterial color="#ff5500" transparent opacity={0.04} depthWrite={false} side={THREE.BackSide} />
        </mesh>
      </group>

      {/* Planet — transparent so opacity can animate */}
      <mesh ref={planetRef} position={[initialDistance, 0, 0]}>
        <sphereGeometry args={[PLANET_RADIUS, 32, 32]} />
        <meshStandardMaterial
          ref={planetMatRef}
          color="#7070ee"
          emissive="#201860"
          emissiveIntensity={0.4}
          roughness={0.55}
          metalness={0.15}
          transparent
        />
      </mesh>

      {/* Crash impact flash — expanding sphere, hidden until crash */}
      <mesh ref={crashFlashRef} visible={false}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial
          ref={crashFlashMatRef}
          color="#ff9a30"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Orbit trail */}
      <primitive object={trailLine} />

      <OrbitControls enablePan={false} minDistance={10} maxDistance={160} enableDamping dampingFactor={0.06} makeDefault />
    </>
  );
}

// ── Canvas wrapper ─────────────────────────────────────────────
export default function OrbitalCanvas({ starMass, initialDistance, initialSpeed, running, resetKey, onUpdate }) {
  return (
    <Canvas
      camera={{ position: [0, 30, 58], fov: 50, near: 0.5, far: 1200 }}
      style={{ width: '100%', height: '100%', background: '#0a0a10' }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.9 }}
    >
      <OrbitalScene
        starMass={starMass}
        initialDistance={initialDistance}
        initialSpeed={initialSpeed}
        running={running}
        resetKey={resetKey}
        onUpdate={onUpdate}
      />
    </Canvas>
  );
}
