import { getCurrentMeasurement, setCurrentMeasurement, addHistoryEntry, getSettings } from '../../js/storage.js';

const m = getCurrentMeasurement();
if(!m || m.calculator !== 'grounding'){
  window.location.href = 'index.html';
}

const decimals = getSettings().decimals ?? 2;

document.getElementById('page-meta').textContent = new Date(m.timestamp).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

document.getElementById('resistance-readout').innerHTML =
  `${m.resistance.toFixed(decimals)}<span style="font-size:22px; color:var(--text-secondary)"> Ω</span>`;
document.getElementById('resistance-readout').style.color = `var(--state-${m.status.group})`;

document.getElementById('status-badge').innerHTML = `
  <div class="badge badge-${m.status.group} badge-pill">
    <span class="pip"></span><span>${m.status.label}</span>
  </div>`;

document.getElementById('criterion-text').textContent =
  `${m.evaluation.criterion} · límite ≤ ${m.evaluation.limitOhms.toFixed(2)} Ω`;

if(m.useIEC && m.necReference){
  document.getElementById('nec-reference-text').textContent =
    `Referencia NEC 250.53: ≤ ${m.necReference.limitOhms} Ω (${m.necReference.label.toLowerCase()}, no determina el estado)`;
}

if(!m.evaluation.pass){
  const rec = document.getElementById('recommendation');
  rec.style.display = 'block';
  rec.textContent = 'No cumple el límite. Se recomienda instalar un electrodo adicional (NEC 250.53(A)(2)), con una separación mínima de 1.8 m (6 pies) entre electrodos.';
}

const grid = document.getElementById('inputs-grid');
let gridHtml = `
  <div><div class="k">RESISTIVIDAD (ρ)</div><div class="v" style="font-family:var(--font-mono)">${m.resistivity.toFixed(decimals)} Ω·m</div></div>
  <div><div class="k">LONGITUD (L)</div><div class="v" style="font-family:var(--font-mono)">${m.length.toFixed(decimals)} m</div></div>
  <div><div class="k">DIÁMETRO (d)</div><div class="v">${m.diameterLabel}</div></div>`;
if(!m.soilKnown){
  gridHtml += `
  <div><div class="k">ESPACIAMIENTO (a)</div><div class="v" style="font-family:var(--font-mono)">${m.wennerA.toFixed(decimals)} m</div></div>
  <div><div class="k">LECTURA TELURÓMETRO (R)</div><div class="v" style="font-family:var(--font-mono)">${m.wennerR.toFixed(decimals)} Ω</div></div>`;
}
if(m.useIEC){
  gridHtml += `<div><div class="k">SENSIBILIDAD (IΔn)</div><div class="v" style="font-family:var(--font-mono)">${m.iDeltaMa} mA</div></div>`;
}
grid.innerHTML = gridHtml;

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
  const text = `Puesta a Tierra STAT\nResistencia: ${m.resistance.toFixed(decimals)} Ω (${m.status.label})\nCriterio: ${m.evaluation.criterion} · límite ≤ ${m.evaluation.limitOhms.toFixed(2)} Ω\nResistividad: ${m.resistivity.toFixed(decimals)} Ω·m · Longitud: ${m.length.toFixed(decimals)} m · Diámetro: ${m.diameterLabel}`;
  try{
    await navigator.clipboard.writeText(text);
    const btn = event.currentTarget;
    const original = btn.innerHTML;
    btn.innerHTML = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--state-good)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
    setTimeout(() => { btn.innerHTML = original; }, 1200);
  }catch(e){ /* portapapeles no disponible */ }
});
