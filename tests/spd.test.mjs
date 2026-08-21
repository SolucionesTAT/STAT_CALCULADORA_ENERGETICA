// Pruebas de docs/calculators/spd/logic.js (Supresores de Transitorios).
// Cubre las 3 ubicaciones (incluida la nota de "combinado Tipo 1+2") y el
// margen de MCOV (1.15× el voltaje nominal).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from '../docs/calculators/spd/logic.js';

const closeTo = (actual, expected, eps = 0.01) => assert.ok(
  Math.abs(actual - expected) < eps,
  `esperaba ~${expected}, obtuve ${actual}`
);

test('tablero de distribución secundario → Tipo 2', () => {
  const r = calculate({ locationId: 'distribution', voltageNominal: 240, exposureId: 'medium' });
  assert.equal(r.spdType, 'Tipo 2');
  assert.equal(r.spdTypeNote, null);
  closeTo(r.mcov, 276); // 240 × 1.15
  assert.equal(r.imaxRange, '15–25 kA');
});

test('acometida → Tipo 1, con nota de combinado 1+2', () => {
  const r = calculate({ locationId: 'service', voltageNominal: 480, exposureId: 'high' });
  assert.equal(r.spdType, 'Tipo 1');
  assert.equal(r.spdTypeNote, 'o combinado Tipo 1+2');
  closeTo(r.mcov, 552); // 480 × 1.15
  assert.equal(r.imaxRange, '25–40 kA');
});

test('punto de uso final → Tipo 3', () => {
  const r = calculate({ locationId: 'point-of-use', voltageNominal: 220, exposureId: 'low' });
  assert.equal(r.spdType, 'Tipo 3');
  closeTo(r.mcov, 253); // 220 × 1.15
  assert.equal(r.imaxRange, '10–15 kA');
});

test('no es una evaluación pasa/no-pasa: status.group siempre es "info"', () => {
  const r = calculate({ locationId: 'distribution', voltageNominal: 240, exposureId: 'medium' });
  assert.equal(r.status.group, 'info');
});
