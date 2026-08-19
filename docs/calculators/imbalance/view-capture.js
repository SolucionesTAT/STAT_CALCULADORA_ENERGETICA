import { getMode, calculate } from './logic.js';
import { setCurrentMeasurement, getCurrentMeasurement } from '../../js/storage.js';

// La "medición actual" es una casilla compartida entre calculadoras (para
// pasar datos entre captura/resultado/reporte). Antes de usarla para
// precargar campos, hay que confirmar que de verdad es de este módulo —
// si viene de otra calculadora (p. ej. Puesta a Tierra), no tiene .mode/.values.
const previousRaw = getCurrentMeasurement();
const previous = previousRaw && previousRaw.calculator === 'imbalance' ? previousRaw : null;
let mode = previous ? previous.mode : 'voltage';
let activeIndex = 0;
const buffers = previous ? previous.values.map(v => String(v)) : ['', '', ''];

const fieldsEl = document.getElementById('fields');
const fieldTitleEl = document.getElementById('field-title');
const filledCountEl = document.getElementById('filled-count');
const calcBtn = document.getElementById('calc-btn');
const modeSwitch = document.getElementById('mode-switch');
const keypad = document.getElementById('keypad');

function renderFields(){
  const cfg = getMode(mode);
  fieldsEl.innerHTML = cfg.tags.map((tag, i) => `
    <div class="numfield" data-index="${i}">
      <span class="tag">${tag}</span>
      <span class="value ${buffers[i] ? '' : 'placeholder'}">${buffers[i] || '0.0'}</span>
      <span class="unit">${cfg.unit}</span>
    </div>
  `).join('');
  fieldTitleEl.textContent = cfg.fieldTitle;
  [...fieldsEl.querySelectorAll('.numfield')].forEach(el => {
    el.addEventListener('click', () => {
      activeIndex = Number(el.dataset.index);
      updateActiveState();
    });
  });
  updateActiveState();
}

function updateActiveState(){
  [...fieldsEl.querySelectorAll('.numfield')].forEach(el => {
    el.classList.toggle('focused', Number(el.dataset.index) === activeIndex);
  });
  const filled = buffers.filter(b => b !== '' && !isNaN(parseFloat(b)) && parseFloat(b) > 0).length;
  filledCountEl.textContent = filled;
  calcBtn.disabled = filled < 3;
}

function updateFieldDisplay(i){
  const el = fieldsEl.querySelector(`.numfield[data-index="${i}"] .value`);
  el.textContent = buffers[i] || '0.0';
  el.classList.toggle('placeholder', !buffers[i]);
}

modeSwitch.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-mode]');
  if(!btn) return;
  mode = btn.dataset.mode;
  buffers[0] = buffers[1] = buffers[2] = '';
  activeIndex = 0;
  [...modeSwitch.querySelectorAll('button')].forEach(b => b.classList.toggle('active', b === btn));
  renderFields();
});

keypad.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-key]');
  if(!btn) return;
  const key = btn.dataset.key;
  let buf = buffers[activeIndex];

  if(key === 'del'){
    buf = buf.slice(0, -1);
  }else if(key === '.'){
    if(!buf.includes('.')) buf += (buf === '' ? '0.' : '.');
  }else{
    if(buf === '0') buf = key;
    else buf += key;
  }
  buffers[activeIndex] = buf;
  updateFieldDisplay(activeIndex);
  updateActiveState();

  if(key !== 'del' && buf !== '' && parseFloat(buf) > 0 && activeIndex < 2){
    // Avanza automáticamente al siguiente campo vacío tras un ingreso válido.
  }
});

calcBtn.addEventListener('click', () => {
  const values = buffers.map(b => parseFloat(b) || 0);
  const result = calculate(values, mode);
  const cfg = getMode(mode);
  setCurrentMeasurement({
    calculator: 'imbalance',
    mode,
    tags: cfg.tags,
    unit: cfg.unit,
    reference: cfg.reference,
    values: result.values,
    avg: result.avg,
    max: result.max,
    min: result.min,
    deviations: result.deviations,
    maxDev: result.maxDev,
    pct: result.pct,
    status: result.status,
    timestamp: new Date().toISOString()
  });
  window.location.href = 'result.html';
});

[...modeSwitch.querySelectorAll('button')].forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
renderFields();
