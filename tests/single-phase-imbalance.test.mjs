// Pruebas de docs/calculators/single-phase-imbalance/logic.js (Desbalance
// Monofásico trifilar). Incluye el chequeo de consistencia L1-L2, que es la
// parte más fácil de romper por accidente (usa L1+L2, no 2×L1 — ver logic.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from '../docs/calculators/single-phase-imbalance/logic.js';

const closeTo = (actual, expected, eps = 0.01) => assert.ok(
  Math.abs(actual - expected) < eps,
  `esperaba ~${expected}, obtuve ${actual}`
);

test('desbalance de tensión con L1-L2 inconsistente (no es un sistema real)', () => {
  const r = calculate([120, 127], 'voltage', 222);
  closeTo(r.pct, 2.834);
  assert.equal(r.status.label, 'PRECAUCIÓN');
  assert.ok(r.consistency, 'debe calcular el chequeo de consistencia');
  closeTo(r.consistency.expected, 247); // 120 + 127, no 2×120
  assert.equal(r.consistency.ok, false);
  closeTo(r.consistency.diffPct, 10.12);
});

test('desbalance de tensión con L1-L2 dentro de tolerancia', () => {
  const r = calculate([115, 125], 'voltage', 245);
  assert.equal(r.status.label, 'CRÍTICO');
  closeTo(r.consistency.expected, 240); // 115 + 125
  assert.equal(r.consistency.ok, true);
});

test('sin L1-L2 informado, no se evalúa consistencia', () => {
  const r = calculate([120, 120], 'voltage');
  assert.equal(r.consistency, null);
});

test('corriente exactamente en el límite de ACEPTABLE (≤10%)', () => {
  const r = calculate([18, 22], 'current');
  closeTo(r.pct, 10);
  assert.equal(r.status.label, 'ACEPTABLE');
  assert.equal(r.consistency, null); // el chequeo L1-L2 solo aplica a tensión
});

test('corriente con desbalance severo → CRÍTICO', () => {
  const r = calculate([9, 32], 'current');
  closeTo(r.pct, 56.098);
  assert.equal(r.status.label, 'CRÍTICO');
});
