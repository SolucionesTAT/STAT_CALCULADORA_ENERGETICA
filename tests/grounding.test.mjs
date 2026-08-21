// Pruebas de docs/calculators/grounding/logic.js (Puesta a Tierra).
// Cubre la fórmula de Dwight, el método de Wenner, y los dos criterios de
// evaluación (NEC 250.53 fijo, e IEC ligado a la sensibilidad del diferencial).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate, resistivityFromWenner, evaluateNEC, evaluateIEC } from '../docs/calculators/grounding/logic.js';

const closeTo = (actual, expected, eps = 0.01) => assert.ok(
  Math.abs(actual - expected) < eps,
  `esperaba ~${expected}, obtuve ${actual}`
);

test('método de Wenner: ρ = 2π·a·R', () => {
  closeTo(resistivityFromWenner(2, 50), 628.3185);
});

test('criterio NEC 250.53: límite fijo de 25 Ω', () => {
  assert.equal(evaluateNEC(24).group, 'good');
  assert.equal(evaluateNEC(26).group, 'crit');
});

test('criterio IEC: límite = 50V / IΔn', () => {
  const r = evaluateIEC(51.46, 0.1); // 100 mA → límite 500 Ω
  assert.equal(r.limitOhms, 500);
  assert.equal(r.pass, true);
});

test('electrodo 5/8″, no cumple NEC (criterio por defecto)', () => {
  const r = calculate({ soilKnown: true, resistivity: 150, wennerA: null, wennerR: null, length: 2.4, diameterM: 0.016, useIEC: false, iDeltaAmps: null });
  closeTo(r.resistance, 53.684);
  assert.equal(r.evaluation.criterion, 'NEC 250.53');
  assert.equal(r.evaluation.pass, false);
  assert.equal(r.necReference, null); // NEC ya es el criterio principal, sin referencia duplicada
});

test('diámetro personalizado + criterio IEC avanzado, con NEC como referencia', () => {
  const r = calculate({ soilKnown: true, resistivity: 150, wennerA: null, wennerR: null, length: 2.4, diameterM: 0.02, useIEC: true, iDeltaAmps: 0.1 });
  closeTo(r.resistance, 51.4646);
  assert.equal(r.evaluation.criterion, 'IEC · tensión de contacto');
  assert.equal(r.evaluation.pass, true);
  assert.ok(r.necReference, 'debe incluir NEC como referencia informativa');
  assert.equal(r.necReference.pass, false);
});

test('resistividad desconocida, calculada por Wenner', () => {
  const r = calculate({ soilKnown: false, resistivity: null, wennerA: 2, wennerR: 50, length: 1.8, diameterM: 0.016, useIEC: false, iDeltaAmps: null });
  closeTo(r.resistivity, 628.3185);
  closeTo(r.resistance, 283.847);
});
