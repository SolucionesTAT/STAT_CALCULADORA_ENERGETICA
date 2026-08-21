import { getHistory, getSettings, deleteHistoryEntry, clearHistory } from '../js/storage.js';

const STATE_LABEL = { good: 'BUENO', warn: 'PRECAUCIÓN', crit: 'CRÍTICO' };
const TRASH_ICON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13"/></svg>';

let entries = getHistory();
let filter = 'all';
let calcFilter = 'all';
let query = '';

const listEl = document.getElementById('list');
const countEl = document.getElementById('count');
const searchInput = document.getElementById('search-input');
const filterRow = document.getElementById('filter-row');
const calcFilterRow = document.getElementById('calc-filter-row');
const clearAllBtn = document.getElementById('clear-all-btn');
const decimals = getSettings().decimals ?? 2;

function monthLabel(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' }).toUpperCase();
}

function render(){
  countEl.textContent = entries.length;
  clearAllBtn.style.display = entries.length ? 'block' : 'none';

  const filtered = entries.filter(e => {
    const matchesFilter = filter === 'all' || e.status.group === filter;
    const matchesCalc = calcFilter === 'all' || (e.calculator || 'imbalance') === calcFilter;
    const haystack = `${e.board || ''} ${e.notes || ''}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    return matchesFilter && matchesCalc && matchesQuery;
  });

  if(filtered.length === 0){
    listEl.innerHTML = `<div class="history-empty">${entries.length === 0 ? 'Aún no has guardado mediciones.' : 'Ninguna medición coincide con el filtro.'}</div>`;
    return;
  }

  let html = '';
  let currentMonth = null;
  filtered.forEach(e => {
    const month = monthLabel(e.timestamp);
    if(month !== currentMonth){
      html += `<div class="history-month">${month}</div>`;
      currentMonth = month;
    }
    html += renderRow(e);
  });
  listEl.innerHTML = html;
}

function renderRow(e){
  const date = new Date(e.timestamp);
  const dateLabel = date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' }) + ' ' +
    date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
  const calculator = e.calculator || 'imbalance';

  let title, meta, resultValue;
  if(calculator === 'grounding'){
    title = e.board || 'Puesta a tierra';
    meta = `${dateLabel} · L=${e.length.toFixed(1)}m · ${e.evaluation.criterion}`;
    resultValue = `${e.resistance.toFixed(decimals)} Ω`;
  }else if(calculator === 'single-phase-imbalance'){
    const modeLabel = e.mode === 'voltage' ? 'Tensión' : 'Corriente';
    title = e.board || `Desbalance monofásico de ${modeLabel.toLowerCase()}`;
    meta = `${dateLabel} · ${e.avg.toFixed(decimals)} ${e.unit} prom.`;
    resultValue = `${e.pct.toFixed(decimals)} %`;
  }else if(calculator === 'cable-sizing'){
    title = e.board || 'Dimensionamiento de cables';
    meta = `${dateLabel} · ${e.currentA.toFixed(1)} A · ${e.lengthM.toFixed(0)} m`;
    resultValue = e.ok ? `${e.mm2} mm²` : 'N/A';
  }else if(calculator === 'spd'){
    title = e.board || `SPD · ${e.spdType}`;
    meta = `${dateLabel} · ${e.locationLabel}`;
    resultValue = e.spdType;
  }else{
    const modeLabel = e.mode === 'voltage' ? 'Tensión' : 'Corriente';
    title = e.board || `Desbalance de ${modeLabel.toLowerCase()}`;
    meta = `${dateLabel} · ${e.avg.toFixed(decimals)} ${e.unit} prom.`;
    resultValue = `${e.pct.toFixed(decimals)} %`;
  }

  // SPD no es una evaluación aprobado/no aprobado — no tiene color de estado
  // real (status.group='info' solo evita que esto se rompa), se pinta con
  // el acento de marca en vez de var(--state-...), que no existe para 'info'
  // a propósito (ver logic.js de SPD).
  const stateColor = calculator === 'spd' ? 'var(--accent)' : `var(--state-${e.status.group})`;
  const stateLabelText = calculator === 'spd' ? 'RECOMENDACIÓN' : STATE_LABEL[e.status.group];

  return `
    <div class="history-item">
      <a class="history-item-link" href="../report/index.html?id=${e.id}">
        <div class="mini-arc" style="background:${stateColor}"></div>
        <div class="info">
          <div class="title">${escapeHtml(title)}</div>
          <div class="meta">${meta}</div>
        </div>
        <div class="result">
          <div class="pct tabular" style="color:${stateColor}">${resultValue}</div>
          <div class="state">${stateLabelText}</div>
        </div>
      </a>
      <button type="button" class="history-item-delete" data-id="${e.id}" aria-label="Eliminar medición">${TRASH_ICON}</button>
    </div>`;
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

filterRow.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-filter]');
  if(!btn) return;
  filter = btn.dataset.filter;
  [...filterRow.querySelectorAll('button')].forEach(b => b.classList.toggle('active', b === btn));
  render();
});

calcFilterRow.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-calc]');
  if(!btn) return;
  calcFilter = btn.dataset.calc;
  [...calcFilterRow.querySelectorAll('button')].forEach(b => b.classList.toggle('active', b === btn));
  render();
});

searchInput.addEventListener('input', () => {
  query = searchInput.value.trim().toLowerCase();
  render();
});

listEl.addEventListener('click', (event) => {
  const btn = event.target.closest('.history-item-delete');
  if(!btn) return;
  event.preventDefault();
  const id = btn.dataset.id;
  if(!confirm('¿Eliminar esta medición del historial? No se puede deshacer.')) return;
  deleteHistoryEntry(id);
  entries = entries.filter(e => e.id !== id);
  render();
});

clearAllBtn.addEventListener('click', () => {
  if(entries.length === 0) return;
  if(!confirm(`¿Borrar las ${entries.length} mediciones del historial? No se puede deshacer.`)) return;
  clearHistory();
  entries = [];
  render();
});

render();
