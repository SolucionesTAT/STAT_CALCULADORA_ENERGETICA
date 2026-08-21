// Pruebas de docs/calculators/cable-sizing/logic.js (Dimensionamiento de
// Cables). Cubre los dos criterios (ampacidad y caída de tensión), cuál de
// los dos determina el calibre final, el escalón de agrupamiento, y los dos
// casos de "sin calibre válido".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from '../docs/calculators/cable-sizing/logic.js';

const closeTo = (actual, expected, eps = 0.01) => assert.ok(
  Math.abs(actual - expected) < eps,
  `esperaba ~${expected}, obtuve ${actual}`
);

test('determinado por caída de tensión (tramo largo)', () => {
  const r = calculate({ currentA: 25, method: 'ducto', ambientC: 30, groupCount: 1, lengthM: 30, voltageV: 120 });
  assert.equal(r.ok, true);
  assert.equal(r.mm2, 10);
  assert.equal(r.determinant, 'caida');
  assert.equal(r.ampacitySize, 4); // la ampacidad sola ya alcanzaba en 4mm²
  closeTo(r.pctDrop, 2.745);
});

test('determinado por ampacidad (tramo corto)', () => {
  const r = calculate({ currentA: 25, method: 'ducto', ambientC: 30, groupCount: 1, lengthM: 2, voltageV: 120 });
  assert.equal(r.mm2, 4);
  assert.equal(r.determinant, 'ampacidad');
});

test('método aire libre, determinado por ampacidad', () => {
  const r = calculate({ currentA: 40, method: 'aireLibre', ambientC: 30, groupCount: 1, lengthM: 15, voltageV: 220 });
  assert.equal(r.mm2, 6);
  assert.equal(r.determinant, 'ampacidad');
});

test('método aire libre, determinado por caída de tensión', () => {
  const r = calculate({ currentA: 40, method: 'aireLibre', ambientC: 30, groupCount: 1, lengthM: 50, voltageV: 220 });
  assert.equal(r.mm2, 16);
  assert.equal(r.determinant, 'caida');
});

test('escalón de agrupamiento: 15 circuitos usa el factor de la fila 16', () => {
  const r = calculate({ currentA: 50, method: 'ducto', ambientC: 30, groupCount: 15, lengthM: 5, voltageV: 220 });
  assert.equal(r.cg, 0.41);
  assert.equal(r.mm2, 35);
});

test('sin calibre válido: corriente excede la tabla incluso a 240mm²', () => {
  const r = calculate({ currentA: 500, method: 'ducto', ambientC: 30, groupCount: 1, lengthM: 10, voltageV: 220 });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'ampacidad');
});

test('sin calibre válido: la caída de tensión nunca baja de 3% (tramo extremo)', () => {
  const r = calculate({ currentA: 10, method: 'ducto', ambientC: 30, groupCount: 1, lengthM: 3000, voltageV: 120 });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'caida');
});

test('ambiente en el límite térmico del PVC (70°C): ningún calibre es válido', () => {
  const r = calculate({ currentA: 25, method: 'ducto', ambientC: 75, groupCount: 1, lengthM: 2, voltageV: 120 });
  assert.equal(r.ca, 0);
  assert.equal(r.ok, false);
});
