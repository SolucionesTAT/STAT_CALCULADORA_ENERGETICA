import { getCurrentMeasurement, setCurrentMeasurement, addHistoryEntry, getSettings } from '../../js/storage.js';

const m = getCurrentMeasurement();
if(!m || m.calculator !== 'spd'){
  window.location.href = 'index.html';
}

document.getElementById('page-meta').textContent = new Date(m.timestamp).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

document.getElementById('type-readout').textContent = m.spdType;
document.getElementById('type-note').textContent = m.spdTypeNote ? m.spdTypeNote : '';
document.getElementById('location-text').textContent = m.locationLabel;

document.getElementById('specs-grid').innerHTML = `
  <div><div class="k">MCOV MÍNIMO RECOMENDADO</div><div class="v" style="font-family:var(--font-mono)">${m.mcov.toFixed(0)} V</div></div>
  <div><div class="k">CORRIENTE DE DESCARGA SUGERIDA (Imax)</div><div class="v" style="font-family:var(--font-mono)">${m.imaxRange}</div></div>
  <div><div class="k">VOLTAJE NOMINAL</div><div class="v" style="font-family:var(--font-mono)">${m.voltageNominal} V</div></div>
  <div><div class="k">EXPOSICIÓN A DESCARGAS</div><div class="v">${m.exposureLabel}</div></div>`;

document.getElementById('checklist').innerHTML = `
  <div style="display:flex; gap:10px; align-items:flex-start; padding:8px 0; border-bottom:1px solid var(--surface-sunken)">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none; margin-top:1px"><path d="M20 6L9 17l-5-5"/></svg>
    <div style="font:400 12.5px/1.5 var(--font-sans); color:var(--text)">El SPD debe estar coordinado con la protección aguas arriba (breaker), según la ficha técnica del fabricante.</div>
  </div>
  <div style="display:flex; gap:10px; align-items:flex-start; padding:8px 0 0">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none; margin-top:1px"><path d="M20 6L9 17l-5-5"/></svg>
    <div style="font:400 12.5px/1.5 var(--font-sans); color:var(--text)">Confirma que el equipo cuente con indicador visual de fin de vida útil.</div>
  </div>`;

document.getElementById('inputs-grid').innerHTML = `
  <div><div class="k">UBICACIÓN</div><div class="v">${m.locationLabel}</div></div>
  <div><div class="k">TIPO RECOMENDADO</div><div class="v">${m.spdType}${m.spdTypeNote ? ' (' + m.spdTypeNote + ')' : ''}</div></div>
  <div><div class="k">VOLTAJE NOMINAL</div><div class="v" style="font-family:var(--font-mono)">${m.voltageNominal} V</div></div>
  <div><div class="k">EXPOSICIÓN</div><div class="v">${m.exposureLabel}</div></div>`;

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
  const typeText = m.spdType + (m.spdTypeNote ? ` (${m.spdTypeNote})` : '');
  const text = `Recomendación SPD STAT\n${typeText} · ${m.locationLabel}\nMCOV mínimo recomendado: ${m.mcov.toFixed(0)} V · Corriente de descarga sugerida: ${m.imaxRange}\nVerificar coordinación con la protección aguas arriba e indicador de fin de vida útil.\nReferencia: IEC 61643-11 (equipos importados: UL 1449 / NEC Art. 285, nomenclatura similar)`;
  try{
    await navigator.clipboard.writeText(text);
    const btn = event.currentTarget;
    const original = btn.innerHTML;
    btn.innerHTML = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--state-good)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
    setTimeout(() => { btn.innerHTML = original; }, 1200);
  }catch(e){ /* portapapeles no disponible */ }
});
