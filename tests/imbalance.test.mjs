// Pruebas de docs/calculators/imbalance/logic.js (Desbalance Trifásico).
// Valores esperados verificados directamente contra la implementación real
// (no recalculados a mano) — ver el mensaje del commit para el detalle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from '../docs/calculators/imbalance/logic.js';

const closeTo = (actual, expected, eps = 0.01) => assert.ok(
  Math.abs(actual - expected) < eps,
  `esperaba ~${expected}, obtuve ${actual}`
);

test('tensión perfectamente balanceada → EXCELENTE, 0%', () => {
  const r = calculate([220, 220, 220], 'voltage');
  closeTo(r.pct, 0);
  assert.equal(r.status.label, 'EXCELENTE');
  assert.equal(r.status.group, 'good');
});

test('tensión con desbalance moderado → PRECAUCIÓN', () => {
  const r = calculate([220, 215, 225], 'voltage');
  closeTo(r.pct, 2.2727);
  assert.equal(r.status.label, 'PRECAUCIÓN');
  assert.equal(r.status.group, 'warn');
  assert.equal(r.avg, 220);
  assert.equal(r.maxDev, 5);
});

test('tensión con desbalance severo → CRÍTICO', () => {
  const r = calculate([220, 180, 220], 'voltage');
  closeTo(r.pct, 12.9032);
  assert.equal(r.status.label, 'CRÍTICO');
  assert.equal(r.status.group, 'crit');
});

test('corriente justo en el límite de ACEPTABLE (≤10%)', () => {
  const r = calculate([10, 10, 10.5], 'current');
  closeTo(r.pct, 3.2787);
  assert.equal(r.status.label, 'ACEPTABLE');
  assert.equal(r.status.group, 'good');
});

test('corriente con desbalance severo → CRÍTICO', () => {
  const r = calculate([10, 10, 15], 'current');
  closeTo(r.pct, 28.5714);
  assert.equal(r.status.label, 'CRÍTICO');
});

test('promedio 0 no produce división por cero', () => {
  const r = calculate([0, 0, 0], 'voltage');
  assert.equal(r.pct, 0);
  assert.equal(r.status.label, 'EXCELENTE');
});
