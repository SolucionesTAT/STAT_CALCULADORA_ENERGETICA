// Motor de cálculo de dimensionamiento de cables — IEC 60364-5-52 (norma
// principal para este módulo, ver CLAUDE.md > "Política de normativas de
// referencia" — decisión tomada específicamente para este módulo).
//
// ALCANCE v1: solo conductor de COBRE, solo circuito MONOFÁSICO (2 hilos).
// No es una limitación arbitraria: son los únicos datos de ampacidad para
// aluminio y para 3 conductores cargados (trifásico) que se intentaron
// conseguir para este módulo resultaron ser una tabla generada por IA con
// números fabricados (mismo % de reducción sobre la tabla de cobre en TODOS
// los calibres — una tabla real de la norma no se comporta así). Antes de
// soportar aluminio/trifásico hace falta la tabla real (Anexo B, IEC
// 60364-5-52), no una aproximación inventada. Ver conversación del proyecto.

// Ampacidad — Tabla B.52.2, aislamiento PVC (conductor 70°C, ambiente 30°C
// en aire), cobre, 2 conductores cargados. Métodos de referencia:
// "ducto" = Método B1 (conductores aislados en tubo, montado en pared).
// "aireLibre" = Método C (cable multiconductor fijado directo a superficie).
export const AMPACITY_TABLE = [
  { mm2: 1.5, ducto: 17.5, aireLibre: 19.5 },
  { mm2: 2.5, ducto: 24, aireLibre: 27 },
  { mm2: 4, ducto: 32, aireLibre: 36 },
  { mm2: 6, ducto: 41, aireLibre: 46 },
  { mm2: 10, ducto: 57, aireLibre: 63 },
  { mm2: 16, ducto: 76, aireLibre: 85 },
  { mm2: 25, ducto: 101, aireLibre: 112 },
  { mm2: 35, ducto: 125, aireLibre: 138 },
  { mm2: 50, ducto: 151, aireLibre: 168 },
  { mm2: 70, ducto: 192, aireLibre: 213 },
  { mm2: 95, ducto: 232, aireLibre: 258 },
  { mm2: 120, ducto: 269, aireLibre: 299 },
  { mm2: 150, ducto: 300, aireLibre: 344 },
  { mm2: 185, ducto: 341, aireLibre: 392 },
  { mm2: 240, ducto: 400, aireLibre: 461 }
];

// Resistencia — IEC 60228, Clase 2 (cableado), cobre desnudo, Ω/km a 20°C.
const RESISTANCE_20C_COPPER = {
  1.5: 12.1, 2.5: 7.41, 4: 4.61, 6: 3.08, 10: 1.83, 16: 1.15, 25: 0.727,
  35: 0.524, 50: 0.387, 70: 0.268, 95: 0.193, 120: 0.153, 150: 0.124,
  185: 0.0991, 240: 0.0754
};

// Factor para llevar la resistencia de 20°C a la temperatura de operación
// del PVC (70°C): 1 + α×ΔT, con α=0.00393/°C (cobre) y ΔT=50°C → ≈1.20.
const OPERATING_TEMP_FACTOR = 1.20;

// Equivalencia AWG/kcmil por calibre más cercano — solo de referencia visual
// para el técnico, no participa en ningún cálculo.
const AWG_EQUIVALENTS = {
  1.5: '16 AWG', 2.5: '14 AWG', 4: '12 AWG', 6: '10 AWG', 10: '8 AWG',
  16: '6 AWG', 25: '4 AWG', 35: '2 AWG', 50: '1/0 AWG', 70: '2/0 AWG',
  95: '3/0 AWG', 120: '250 kcmil', 150: '300 kcmil', 185: '350 kcmil', 240: '500 kcmil'
};

// Agrupamiento — Tabla B.52.17 (circuitos que comparten ducto/bandeja).
const GROUPING_FACTORS = { 1: 1.00, 2: 0.80, 3: 0.70, 4: 0.65, 5: 0.60, 6: 0.57, 7: 0.54, 8: 0.52, 9: 0.50, 12: 0.45, 16: 0.41, 20: 0.38 };
const GROUPING_KEYS = Object.keys(GROUPING_FACTORS).map(Number).sort((a, b) => a - b);

function groupingFactor(count){
  for(const k of GROUPING_KEYS){
    if(count <= k) return GROUPING_FACTORS[k];
  }
  return GROUPING_FACTORS[GROUPING_KEYS[GROUPING_KEYS.length - 1]];
}

// Corrección por temperatura ambiente — no es una tabla (Tabla B.52.14):
// los valores publicados coinciden exactamente con esta fórmula de la propia
// norma, Ca = √[(θmáx−Tambiente)/(θmáx−30)], con θmáx=70°C para PVC. Usar la
// fórmula da un resultado continuo y más preciso que una tabla con saltos
// de 5°C.
function ambientCorrectionFactor(ambientC){
  if(ambientC >= 70) return 0; // por encima del límite térmico del PVC, ningún calibre es válido
  return Math.sqrt((70 - ambientC) / (70 - 30));
}

// Umbral de caída de tensión — guía práctica de diseño de uso común en la
// industria (ver CLAUDE.md), no un límite impuesto por IEC 60364-5-52.
export const VOLTAGE_DROP_LIMIT_PCT = 3;

function voltageDropPct(mm2, currentA, lengthM, voltageV){
  const r = RESISTANCE_20C_COPPER[mm2] * OPERATING_TEMP_FACTOR;
  return (2 * currentA * lengthM * r) / (1000 * voltageV) * 100;
}

// input: { currentA, method: 'ducto'|'aireLibre', ambientC, groupCount, lengthM, voltageV }
export function calculate(input){
  const { currentA, method, ambientC, groupCount, lengthM, voltageV } = input;
  const ca = ambientCorrectionFactor(ambientC);
  const cg = groupingFactor(groupCount);

  const rows = AMPACITY_TABLE.map(row => ({
    mm2: row.mm2,
    izCorrected: row[method] * ca * cg,
    pctDrop: voltageDropPct(row.mm2, currentA, lengthM, voltageV)
  }));

  const ampacityRow = rows.find(r => r.izCorrected >= currentA);
  if(!ampacityRow){
    return {
      ok: false,
      reason: 'ampacidad',
      ca, cg,
      status: { group: 'crit', label: 'SIN CALIBRE VÁLIDO' }
    };
  }

  const finalRow = rows.find(r => r.mm2 >= ampacityRow.mm2 && r.pctDrop <= VOLTAGE_DROP_LIMIT_PCT);
  if(!finalRow){
    return {
      ok: false,
      reason: 'caida',
      ca, cg,
      ampacitySize: ampacityRow.mm2,
      status: { group: 'crit', label: 'SIN CALIBRE VÁLIDO' }
    };
  }

  const determinant = finalRow.mm2 === ampacityRow.mm2 ? 'ampacidad' : 'caida';

  return {
    ok: true,
    mm2: finalRow.mm2,
    awg: AWG_EQUIVALENTS[finalRow.mm2],
    izCorrected: finalRow.izCorrected,
    pctDrop: finalRow.pctDrop,
    ampacitySize: ampacityRow.mm2,
    determinant,
    ca, cg,
    status: { group: 'good', label: 'CUMPLE' }
  };
}
