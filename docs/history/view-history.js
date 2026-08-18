import { getHistory, getSettings } from '../js/storage.js';

const STATE_LABEL = { good: 'BUENO', warn: 'PRECAUCIÓN', crit: 'CRÍTICO' };

let entries = getHistory();
let filter = 'all';
let query = '';

const listEl = document.getElementById('list');
const countEl = document.getElementById('count');
const searchInput = document.getElementById('search-input');
const filterRow = document.getElementById('filter-row');
const decimals = getSettings().decimals ?? 2;

function monthLabel(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' }).toUpperCase();
}

function render(){
  countEl.textContent = entries.length;

  const filtered = entries.filter(e => {
    const matchesFilter = filter === 'all' || e.status.group === filter;
    const haystack = `${e.board || ''} ${e.notes || ''}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    return matchesFilter && matchesQuery;
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
    const date = new Date(e.timestamp);
    const dateLabel = date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' }) + ' ' +
      date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    const modeLabel = e.mode === 'voltage' ? 'Tensión' : 'Corriente';
    const title = e.board || `Desbalance de ${modeLabel.toLowerCase()}`;
    html += `
      <a class="history-item" href="../report/index.html?id=${e.id}" style="text-decoration:none">
        <div class="mini-arc" style="background:var(--state-${e.status.group})"></div>
        <div class="info">
          <div class="title">${escapeHtml(title)}</div>
          <div class="meta">${dateLabel} · ${e.avg.toFixed(decimals)} ${e.unit} prom.</div>
        </div>
        <div class="result">
          <div class="pct tabular" style="color:var(--state-${e.status.group})">${e.pct.toFixed(decimals)} %</div>
          <div class="state">${STATE_LABEL[e.status.group]}</div>
        </div>
      </a>`;
  });
  listEl.innerHTML = html;
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

searchInput.addEventListener('input', () => {
  query = searchInput.value.trim().toLowerCase();
  render();
});

render();
