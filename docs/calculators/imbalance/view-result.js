import { getMode } from './logic.js';
import { renderGauge } from '../../js/gauge.js';
import { getCurrentMeasurement, setCurrentMeasurement, addHistoryEntry, getSettings } from '../../js/storage.js';

const m = getCurrentMeasurement();
if(!m){
  window.location.href = 'index.html';
}

const cfg = getMode(m.mode);
const decimals = getSettings().decimals ?? 2;
const modeLabelLower = m.mode === 'voltage' ? 'tensión' : 'corriente';

document.getElementById('page-title').textContent = `Desbalance de ${modeLabelLower}`;
document.getElementById('page-meta').textContent = new Date(m.timestamp).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

// ---- Chips de valores capturados (con acceso rápido a editar) ----
const chipsRow = document.getElementById('chips-row');
chipsRow.innerHTML = m.tags.map((tag, i) => `
  <div class="card" style="flex:1; padding:9px 11px">
    <div style="font:500 9px var(--font-mono); color:var(--text-tertiary); letter-spacing:.06em">${tag}</div>
    <div class="tabular" style="font:600 15px var(--font-mono); color:var(--text); margin-top:3px">${m.values[i].toFixed(decimals)}</div>
  </div>
`).join('') + `
  <a href="index.html" style="width:40px; border:1px dashed var(--border); border-radius:var(--r-cell); display:flex; align-items:center; justify-content:center; flex:none; color:var(--accent)" aria-label="Editar valores">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4l5 5-9 9H6v-5z"/></svg>
  </a>`;

// ---- Arco de umbral ----
const gaugeEl = document.getElementById('gauge');
renderGauge(gaugeEl, { pct: m.pct, gaugeMax: cfg.gaugeMax, thresholds: cfg.thresholds });

const scaleMarks = [0, ...cfg.gaugeMarks, cfg.gaugeMax];
document.getElementById('gauge-scale').innerHTML = scaleMarks.map(v => `<span>${v} %</span>`).join('');

document.getElementById('pct-readout').innerHTML = `${m.pct.toFixed(decimals)}<span class="pct"> %</span>`;

const statusIndex = cfg.thresholds.findIndex(t => t.label === m.status.label);
const subText = statusIndex === 0
  ? `Dentro del límite de ${cfg.thresholds[0].max} %`
  : `Supera el límite de ${cfg.thresholds[statusIndex - 1].max} %`;
document.getElementById('status-sub').textContent = subText.toUpperCase();

document.getElementById('status-badge').innerHTML = `
  <div class="badge badge-${m.status.group} badge-pill">
    <span class="pip"></span><span>${m.status.label}</span>
  </div>`;

// ---- Desviación por línea ----
const devBars = document.getElementById('dev-bars');
devBars.innerHTML = m.deviations.map((dev, i) => {
  const heightPct = m.maxDev === 0 ? 0 : Math.round((Math.abs(dev) / m.maxDev) * 100);
  return `
    <div class="dev-bar-col">
      <div class="val tabular">${m.values[i].toFixed(decimals)}</div>
      <div class="dev-bar-track">
        <div class="dev-bar-fill" style="height:${heightPct}%; background:linear-gradient(to top, var(--state-${m.status.group}), transparent)"></div>
      </div>
      <div class="tag">${m.tags[i]}</div>
    </div>`;
}).join('') + `
  <div class="dev-side-stats">
    <div><div class="k">PROMEDIO</div><div class="v tabular">${m.avg.toFixed(decimals)} ${m.unit}</div></div>
    <div><div class="k">DESV. MÁX</div><div class="v tabular" style="color:var(--state-${m.status.group})">${m.maxDev.toFixed(decimals)} ${m.unit}</div></div>
    <div><div class="k">MÁX / MÍN</div><div class="v tabular">${m.max.toFixed(1)} / ${m.min.toFixed(1)}</div></div>
  </div>`;

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

// ---- Generar reporte ----
document.getElementById('report-btn').addEventListener('click', () => {
  const extras = collectExtras();
  setCurrentMeasurement({ ...m, ...extras });
  window.location.href = '../../report/index.html';
});

// ---- Copiar resultado ----
document.getElementById('copy-btn').addEventListener('click', async (event) => {
  const modeLabel = m.mode === 'voltage' ? 'Tensión' : 'Corriente';
  const lines = m.tags.map((tag, i) => `${tag}: ${m.values[i].toFixed(decimals)} ${m.unit}`).join(' · ');
  const text = `Balance Eléctrico STAT — ${modeLabel}\nDesbalance: ${m.pct.toFixed(decimals)}% (${m.status.label})\n${lines}\nPromedio: ${m.avg.toFixed(decimals)} ${m.unit} · Desv. máx: ${m.maxDev.toFixed(decimals)} ${m.unit}\nReferencia: ${m.reference}`;
  try{
    await navigator.clipboard.writeText(text);
    const btn = event.currentTarget;
    const original = btn.innerHTML;
    btn.innerHTML = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--state-good)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
    setTimeout(() => { btn.innerHTML = original; }, 1200);
  }catch(e){ /* portapapeles no disponible */ }
});
