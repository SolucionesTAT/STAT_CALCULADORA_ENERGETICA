import { VOLTAGE_DROP_LIMIT_PCT } from './logic.js';
import { getCurrentMeasurement, setCurrentMeasurement, addHistoryEntry, getSettings } from '../../js/storage.js';

const m = getCurrentMeasurement();
if(!m || m.calculator !== 'cable-sizing'){
  window.location.href = 'index.html';
}

const decimals = getSettings().decimals ?? 2;
const methodLabel = m.method === 'ducto' ? 'Ducto/canalización' : 'Aire libre';

document.getElementById('page-meta').textContent = new Date(m.timestamp).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

document.getElementById('status-badge').innerHTML = `
  <div class="badge badge-${m.status.group} badge-pill">
    <span class="pip"></span><span>${m.status.label}</span>
  </div>`;

if(m.ok){
  document.getElementById('size-readout').innerHTML = `${m.mm2}<span style="font-size:20px; color:var(--text-secondary)"> mm²</span>`;
  document.getElementById('awg-readout').textContent = `≈ ${m.awg}`;

  document.getElementById('determinant-text').textContent = m.determinant === 'ampacidad'
    ? 'Determinado por ampacidad'
    : `Determinado por caída de tensión — se requirió aumentar el calibre sobre el ${m.ampacitySize} mm² que ya cumplía ampacidad`;

  document.getElementById('criteria-grid').innerHTML = `
    <div><div class="k">AMPACIDAD CORREGIDA (Iz)</div><div class="v" style="font-family:var(--font-mono)">${m.izCorrected.toFixed(decimals)} A ≥ ${m.currentA.toFixed(decimals)} A</div></div>
    <div><div class="k">FACTORES APLICADOS</div><div class="v" style="font-family:var(--font-mono)">Ca=${m.ca.toFixed(2)} · Cg=${m.cg.toFixed(2)}</div></div>
    <div><div class="k">CAÍDA DE TENSIÓN</div><div class="v" style="font-family:var(--font-mono)">${m.pctDrop.toFixed(decimals)} % ≤ ${VOLTAGE_DROP_LIMIT_PCT} %</div></div>
    <div><div class="k">REFERENCIA</div><div class="v">Umbral práctico de diseño, no límite de IEC 60364-5-52</div></div>`;
}else{
  document.getElementById('size-readout').textContent = 'N/A';
  document.getElementById('determinant-text').textContent = m.reason === 'ampacidad'
    ? 'Ningún calibre de la tabla (hasta 240 mm²) soporta esta corriente con las condiciones ingresadas. Revisa temperatura ambiente, agrupamiento, o considera dividir el circuito.'
    : `La caída de tensión supera ${VOLTAGE_DROP_LIMIT_PCT}% incluso en el calibre más grande de la tabla (240 mm², que sí cumple ampacidad desde ${m.ampacitySize} mm²). Considera acortar el tramo o subir el voltaje del sistema.`;

  document.getElementById('criteria-grid').innerHTML = `
    <div><div class="k">FACTORES APLICADOS</div><div class="v" style="font-family:var(--font-mono)">Ca=${m.ca.toFixed(2)} · Cg=${m.cg.toFixed(2)}</div></div>`;
}

document.getElementById('inputs-grid').innerHTML = `
  <div><div class="k">CORRIENTE DE DISEÑO</div><div class="v" style="font-family:var(--font-mono)">${m.currentA.toFixed(decimals)} A</div></div>
  <div><div class="k">MÉTODO</div><div class="v">${methodLabel}</div></div>
  <div><div class="k">TEMPERATURA AMBIENTE</div><div class="v" style="font-family:var(--font-mono)">${m.ambientC.toFixed(1)} °C</div></div>
  <div><div class="k">CONDUCTORES AGRUPADOS</div><div class="v" style="font-family:var(--font-mono)">${m.groupCount}</div></div>
  <div><div class="k">LONGITUD DEL TRAMO</div><div class="v" style="font-family:var(--font-mono)">${m.lengthM.toFixed(decimals)} m</div></div>
  <div><div class="k">VOLTAJE DEL SISTEMA</div><div class="v" style="font-family:var(--font-mono)">${m.voltageV.toFixed(decimals)} V</div></div>
  <div><div class="k">CONDUCTOR / CIRCUITO</div><div class="v">Cobre · Monofásico</div></div>`;

// ---- Guardar en historial ----
const saveBtn = document.getElementById('save-btn');
const boardInput = document.getElementById('board-input');
const notesInput = document.getElementById('notes-input');
let saved = false;

function collectExtras(){
  return {
    board: boardInput.value.trim(),
    notes: notesInput.value.trim(),
    technician: getSettings().technician || ''
  };
}

saveBtn.addEventListener('click', () => {
  if(saved) return;
  const extras = collectExtras();
  const record = { ...m, ...extras };
  addHistoryEntry(record);
  setCurrentMeasurement(record);
  saved = true;
  saveBtn.innerHTML = `
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--state-good)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
    Guardado en historial`;
});

document.getElementById('report-btn').addEventListener('click', () => {
  const extras = collectExtras();
  setCurrentMeasurement({ ...m, ...extras });
  window.location.href = '../../report/index.html';
});

document.getElementById('copy-btn').addEventListener('click', async (event) => {
  const sizeText = m.ok ? `${m.mm2} mm² (≈ ${m.awg})` : 'Sin calibre válido';
  const text = `Dimensionamiento de Cables STAT\nCalibre: ${sizeText} (${m.status.label})\nCorriente de diseño: ${m.currentA.toFixed(decimals)} A · Método: ${methodLabel}\nLongitud: ${m.lengthM.toFixed(decimals)} m · Voltaje: ${m.voltageV.toFixed(decimals)} V${m.ok ? `\nCaída de tensión: ${m.pctDrop.toFixed(decimals)} %` : ''}\nReferencia: IEC 60364-5-52 (ampacidad) · umbral práctico de caída ≤${VOLTAGE_DROP_LIMIT_PCT}%`;
  try{
    await navigator.clipboard.writeText(text);
    const btn = event.currentTarget;
    const original = btn.innerHTML;
    btn.innerHTML = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--state-good)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
    setTimeout(() => { btn.innerHTML = original; }, 1200);
  }catch(e){ /* portapapeles no disponible */ }
});
