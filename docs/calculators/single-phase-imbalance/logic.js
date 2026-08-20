// Motor de cálculo de desbalance eléctrico monofásico trifilar (120/240V,
// L1 y L2 desfasadas 180° desde una misma fase, con neutro compartido).
// NO confundir con el módulo de Desbalance Trifásico (../imbalance/logic.js),
// que usa NEMA MG-1 — esa norma es de motores trifásicos y no aplica aquí.
//
// No existe una norma publicada con un % de corte para comparar L1 contra L2
// en este tipo de sistema (ANSI C84.1 regula tensión de servicio vs. nominal,
// no esta comparación; NEC 220.61 es un método de cálculo de neutro, no un
// límite de aceptación). Los umbrales de abajo son un criterio OPERATIVO de
// STAT, no una cita normativa — y a diferencia del trifásico, ni siquiera
// están derivados de un cálculo específico para este caso: por consistencia
// visual se reutilizaron los mismos cortes que NEMA MG-1 usa para motores
// trifásicos (1/2/3 % en V, 10/20 % en A), sin que exista una justificación
// técnica propia para monofásico. Son un punto de partida razonable, no un
// valor validado — ajústense con datos reales de campo si en la práctica
// resultan demasiado estrictos o demasiado laxos.
//
// Mismo principio del trifásico (desviación máxima respecto al promedio),
// generalizado a 2 líneas en vez de 3.

export const MODES = {
  voltage: {
    id: 'voltage',
    unit: 'V',
    label: 'Tensión',
    tags: ['L1-N', 'L2-N', 'L1-L2'],
    requiredCount: 2,
    fieldTitle: 'Tensión línea a neutro',
    reference: 'Criterio operativo de STAT (sin norma específica aplicable)',
    thresholds: [
      { max: 1, label: 'EXCELENTE', group: 'good' },
      { max: 2, label: 'ACEPTABLE', group: 'good' },
      { max: 3, label: 'PRECAUCIÓN', group: 'warn' },
      { max: Infinity, label: 'CRÍTICO', group: 'crit' }
    ],
    gaugeMax: 4,
    gaugeMarks: [1, 2, 3],
    hasConsistencyCheck: true
  },
  current: {
    id: 'current',
    unit: 'A',
    label: 'Corriente',
    tags: ['I L1', 'I L2'],
    requiredCount: 2,
    fieldTitle: 'Corriente por línea',
    reference: 'Criterio operativo de STAT (sin norma específica aplicable)',
    thresholds: [
      { max: 10, label: 'ACEPTABLE', group: 'good' },
      { max: 20, label: 'PRECAUCIÓN', group: 'warn' },
      { max: Infinity, label: 'CRÍTICO', group: 'crit' }
    ],
    gaugeMax: 30,
    gaugeMarks: [10, 20],
    hasConsistencyCheck: false
  }
};

// Tolerancia del chequeo opcional de consistencia L1-L2 (ver calculate()).
const CONSISTENCY_TOLERANCE_PCT = 5;

export function getMode(modeId){
  return MODES[modeId] || MODES.voltage;
}

export function getStatus(pct, modeId){
  const mode = getMode(modeId);
  for(const level of mode.thresholds){
    if(pct <= level.max) return level;
  }
  return mode.thresholds[mode.thresholds.length - 1];
}

// values: [l1, l2] — magnitudes de las dos líneas.
// l1l2: lectura opcional de L1 a L2 (solo modo tensión), para verificar que
// la instalación es realmente monofásica trifilar. Con 180° de diferencia de
// fase entre L1 y L2, el valor línea-línea esperado es la SUMA de las dos
// magnitudes línea-neutro (L1-N + L2-N) — no el doble de una sola lectura,
// que solo sería una aproximación válida si el sistema ya estuviera
// perfectamente balanceado (justo lo que este chequeo no puede asumir).
export function calculate(values, modeId, l1l2 = null){
  const [l1, l2] = values;
  const avg = (l1 + l2) / 2;
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  const deviations = values.map(v => v - avg);
  const maxDev = Math.max(...deviations.map(Math.abs));
  const pct = avg === 0 ? 0 : (maxDev / avg) * 100;
  const status = getStatus(pct, modeId);

  let consistency = null;
  if(modeId === 'voltage' && l1l2 != null && l1l2 > 0){
    const expected = l1 + l2;
    const diffPct = expected === 0 ? 0 : (Math.abs(l1l2 - expected) / expected) * 100;
    consistency = { measured: l1l2, expected, diffPct, ok: diffPct <= CONSISTENCY_TOLERANCE_PCT };
  }

  return { values, avg, max, min, deviations, maxDev, pct, status, mode: modeId, consistency };
}
