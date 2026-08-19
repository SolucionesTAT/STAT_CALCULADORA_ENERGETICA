// Motor de cálculo de puesta a tierra (electrodo vertical) — fórmula de Dwight.
// Ver CLAUDE.md > "Política de normativas de referencia": para este módulo,
// NEC 250.53 es el criterio principal (uso por defecto para todos los
// técnicos); IEC (tensión de contacto) es el criterio avanzado/secundario,
// para cuando se conoce la sensibilidad del diferencial de la instalación.

// Diámetros comerciales de varilla más comunes (valores aproximados dados
// por el negocio, no recalcular a partir de la conversión exacta in→m).
export const ROD_DIAMETERS = [
  { id: '5/8', label: '5/8″', meters: 0.016 },
  { id: '3/4', label: '3/4″', meters: 0.019 },
  { id: 'other', label: 'Otro', meters: null }
];

// Sensibilidades comunes de interruptor diferencial para el criterio IEC.
export const IEC_SENSITIVITIES = [
  { id: 30, label: '30 mA', amps: 0.030 },
  { id: 100, label: '100 mA', amps: 0.100 },
  { id: 300, label: '300 mA', amps: 0.300 },
  { id: 500, label: '500 mA', amps: 0.500 }
];

export const NEC_LIMIT_OHMS = 25;
export const IEC_TOUCH_VOLTAGE = 50; // V, tensión de contacto de referencia

// Método de Wenner (4 electrodos): resistividad del suelo a partir de una
// lectura de telurómetro, cuando el técnico no conoce ρ directamente.
export function resistivityFromWenner(spacingM, readingOhms){
  return 2 * Math.PI * spacingM * readingOhms;
}

// Fórmula de Dwight: resistencia de un electrodo vertical.
export function groundResistance(resistivityOhmM, lengthM, diameterM){
  return (resistivityOhmM / (2 * Math.PI * lengthM)) * (Math.log((4 * lengthM) / diameterM) - 1);
}

// Criterio principal — NEC 250.53: límite fijo de 25 Ω.
export function evaluateNEC(resistanceOhms){
  const pass = resistanceOhms <= NEC_LIMIT_OHMS;
  return {
    criterion: 'NEC 250.53',
    limitOhms: NEC_LIMIT_OHMS,
    pass,
    group: pass ? 'good' : 'crit',
    label: pass ? 'CUMPLE' : 'NO CUMPLE'
  };
}

// Criterio avanzado — IEC: límite ligado a la sensibilidad del diferencial.
export function evaluateIEC(resistanceOhms, iDeltaAmps){
  const limitOhms = IEC_TOUCH_VOLTAGE / iDeltaAmps;
  const pass = resistanceOhms <= limitOhms;
  return {
    criterion: 'IEC · tensión de contacto',
    limitOhms,
    pass,
    group: pass ? 'good' : 'crit',
    label: pass ? 'CUMPLE' : 'NO CUMPLE'
  };
}

// Cálculo completo a partir de los datos capturados en la pantalla.
export function calculate(input){
  const { soilKnown, resistivity, wennerA, wennerR, length, diameterM, useIEC, iDeltaAmps } = input;

  const finalResistivity = soilKnown ? resistivity : resistivityFromWenner(wennerA, wennerR);
  const resistance = groundResistance(finalResistivity, length, diameterM);

  const primary = useIEC ? evaluateIEC(resistance, iDeltaAmps) : evaluateNEC(resistance);
  const necReference = useIEC ? evaluateNEC(resistance) : null;

  return {
    resistivity: finalResistivity,
    resistance,
    evaluation: primary,
    necReference
  };
}
