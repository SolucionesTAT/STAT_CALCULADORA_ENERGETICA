// Motor de recomendación de SPD (supresores de transitorios) — IEC 61643-11
// (clasificación Tipo 1/2/3 para baja tensión).
//
// A diferencia de los demás módulos, esto NO es un cálculo de aprobado/no
// aprobado — es una guía de selección. No hay un porcentaje que evaluar
// contra un umbral, así que no se le fuerza un status good/warn/crit real.
// status.group='info' existe solo para que los componentes compartidos
// (Historial, Inicio) puedan renderizar el registro sin romperse — nunca se
// pinta con un color de estado (no existe var(--state-info) y no debe
// inventarse uno nuevo, ver css/tokens.css); donde hace falta color se
// reutiliza --accent, tratándolo como informativo, no como "aprobado".

export const LOCATIONS = [
  { id: 'service', label: 'Acometida / entrada de servicio principal', spdType: 'Tipo 1', spdTypeNote: 'o combinado Tipo 1+2' },
  { id: 'distribution', label: 'Tablero de distribución secundario', spdType: 'Tipo 2', spdTypeNote: null },
  { id: 'point-of-use', label: 'Punto de uso final (cerca de equipo específico)', spdType: 'Tipo 3', spdTypeNote: null }
];

export const VOLTAGE_PRESETS = [120, 208, 220, 240, 380, 440];

// Rango orientativo de corriente de descarga (Imax) por nivel de exposición.
// Guía general, no el cálculo de evaluación de riesgo de IEC 62305-2 (fuera
// de alcance de este módulo a propósito).
export const EXPOSURE_LEVELS = [
  { id: 'low', label: 'Baja', imaxRange: '10–15 kA' },
  { id: 'medium', label: 'Media', imaxRange: '15–25 kA' },
  { id: 'high', label: 'Alta', imaxRange: '25–40 kA' }
];

// Margen práctico para el MCOV mínimo recomendado — guía de uso común de la
// industria, no un valor exacto impuesto por IEC 61643-11.
const MCOV_MARGIN = 1.15;

export function getLocation(id){
  return LOCATIONS.find(l => l.id === id);
}

export function getExposure(id){
  return EXPOSURE_LEVELS.find(e => e.id === id);
}

export function calculate({ locationId, voltageNominal, exposureId }){
  const location = getLocation(locationId);
  const exposure = getExposure(exposureId);
  const mcov = voltageNominal * MCOV_MARGIN;

  return {
    locationId,
    locationLabel: location.label,
    spdType: location.spdType,
    spdTypeNote: location.spdTypeNote,
    voltageNominal,
    mcov,
    exposureId,
    exposureLabel: exposure.label,
    imaxRange: exposure.imaxRange,
    status: { group: 'info', label: 'Recomendación' }
  };
}
