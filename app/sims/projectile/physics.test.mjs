// Run with:  node --test app/sims/projectile/
//
// The physics module ships two models: a closed-form analytic (vacuum)
// solution and a numerical RK4 integrator that also handles air drag.
// The cornerstone test: with drag = 0 the RK4 integrator MUST converge to
// the analytic answer. If it does, we trust the integrator for the drag
// case where no closed form exists.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcReadouts, integrateTrajectory } from './physics.js';

const G = 9.8;
const close = (a, b, tol) => Math.abs(a - b) <= tol;

test('RK4 (drag=0) converges to the analytic range', () => {
  for (const [angle, speed] of [[45, 25], [30, 40], [60, 30], [75, 20]]) {
    const exact = calcReadouts(angle, speed, G);
    const num   = integrateTrajectory(angle, speed, G, 0);
    assert.ok(close(num.range, exact.range, 0.05),
      `range @${angle}°/${speed}: RK4 ${num.range.toFixed(3)} vs analytic ${exact.range.toFixed(3)}`);
    assert.ok(close(num.maxHeight, exact.maxHeight, 0.05),
      `maxHeight @${angle}°/${speed}: RK4 ${num.maxHeight.toFixed(3)} vs analytic ${exact.maxHeight.toFixed(3)}`);
    assert.ok(close(num.timeOfFlight, exact.timeOfFlight, 0.02),
      `TOF @${angle}°/${speed}: RK4 ${num.timeOfFlight.toFixed(3)} vs analytic ${exact.timeOfFlight.toFixed(3)}`);
  }
});

test('drag strictly reduces range and landing speed', () => {
  const vac  = integrateTrajectory(45, 40, G, 0);
  const drag = integrateTrajectory(45, 40, G, 0.02);
  assert.ok(drag.range < vac.range, 'drag should shorten the range');
  assert.ok(drag.landingSpeed < 40, 'drag should bleed energy → land slower than launch');
  assert.ok(close(vac.landingSpeed, 40, 0.05), 'vacuum lands at launch speed (symmetry)');
});

test('lower gravity (Moon) flies farther than Earth', () => {
  const earth = integrateTrajectory(45, 30, 9.8, 0);
  const moon  = integrateTrajectory(45, 30, 1.6, 0);
  assert.ok(moon.range > earth.range, 'Moon range should exceed Earth range');
});

test('a flat (0°) or downward launch produces no flight', () => {
  const flat = integrateTrajectory(0, 30, G, 0);
  assert.equal(flat.range, 0);
  assert.equal(flat.timeOfFlight, 0);
});

test('integrated samples are monotonic in time and start at the origin', () => {
  const { samples } = integrateTrajectory(50, 35, G, 0.01);
  assert.deepEqual({ x: samples[0].x, y: samples[0].y }, { x: 0, y: 0 });
  for (let i = 1; i < samples.length; i++) {
    assert.ok(samples[i].t > samples[i - 1].t, 'time must strictly increase');
  }
});
