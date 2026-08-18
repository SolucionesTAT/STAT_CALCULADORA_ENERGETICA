// Motor de cálculo de desbalance eléctrico trifásico — metodología NEMA MG-1.
// Fórmula y umbrales validados en CLAUDE.md > "Lógica de negocio: cálculo de
// desbalance eléctrico". No modificar sin razón técnica documentada ahí.
//
// Se basa solo en magnitudes (sin ángulo de fase) — deliberado, ver CLAUDE.md
// para el porqué frente a IEC 60034-26 (VUF por componentes simétricas).

export const MODES = {
  voltage: {
    id: 'voltage',
    unit: 'V',
    label: 'Tensión',
    icon: 'voltage',
    tags: ['V AB', 'V BC', 'V CA'],
    fieldTitle: 'Tensión entre líneas',
    reference: 'NEMA MG-1 · IEC 60034-1',
    // Umbrales de estado — Modo Tensión (V). El corte de 1% coincide con el
    // límite de IEC 60034-1 cláusula 7.2.1.
    thresholds: [
      { max: 1, label: 'EXCELENTE', group: 'good' },
      { max: 2, label: 'ACEPTABLE', group: 'good' },
      { max: 3, label: 'PRECAUCIÓN', group: 'warn' },
      { max: Infinity, label: 'CRÍTICO', group: 'crit' }
    ],
    gaugeMax: 4,
    gaugeMarks: [1, 2, 3]
  },
  current: {
    id: 'current',
    unit: 'A',
    label: 'Corriente',
    icon: 'current',
    tags: ['I A', 'I B', 'I C'],
    fieldTitle: 'Corriente por línea',
    reference: 'NEMA MG-1',
    // Umbrales de estado — Modo Corriente (A).
    thresholds: [
      { max: 10, label: 'ACEPTABLE', group: 'good' },
      { max: 20, label: 'PRECAUCIÓN', group: 'warn' },
      { max: Infinity, label: 'CRÍTICO', group: 'crit' }
    ],
    gaugeMax: 30,
    gaugeMarks: [10, 20]
  }
};

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

// values: [a, b, c] — magnitudes de las tres líneas/fases.
export function calculate(values, modeId){
  const [a, b, c] = values;
  const avg = (a + b + c) / 3;
  const max = Math.max(a, b, c);
  const min = Math.min(a, b, c);
  const deviations = values.map(v => v - avg);
  const maxDev = Math.max(...deviations.map(Math.abs));
  const pct = avg === 0 ? 0 : (maxDev / avg) * 100;
  const status = getStatus(pct, modeId);
  return { values, avg, max, min, deviations, maxDev, pct, status, mode: modeId };
}
