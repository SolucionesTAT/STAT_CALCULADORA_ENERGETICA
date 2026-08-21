import { getMode, calculate } from './logic.js';
import { setCurrentMeasurement, getCurrentMeasurement } from '../../js/storage.js';

// La "medición actual" es una casilla compartida entre calculadoras — antes
// de prellenar campos hay que confirmar que de verdad es de este módulo.
// Solo se precarga si se llegó con ?edit=1 (botón del lápiz en Resultado) —
// la flecha de regresar o el atrás del navegador deben dejar los campos
// vacíos.
const isEdit = new URLSearchParams(window.location.search).get('edit') === '1';
const previousRaw = getCurrentMeasurement();
const previous = isEdit && previousRaw && previousRaw.calculator === 'single-phase-imbalance' ? previousRaw : null;
let mode = previous ? previous.mode : 'voltage';
let activeIndex = 0;

function initialBuffers(){
  const cfg = getMode(mode);
  if(previous && previous.mode === mode){
    const buf = previous.values.map(v => String(v));
    if(cfg.tags.length > buf.length) buf.push(previous.l1l2 != null ? String(previous.l1l2) : '');
    return buf.slice(0, cfg.tags.length);
  }
  return cfg.tags.map(() => '');
}

let buffers = initialBuffers();

const fieldsEl = document.getElementById('fields');
const fieldTitleEl = document.getElementById('field-title');
const filledCountEl = document.getElementById('filled-count');
const requiredCountEl = document.getElementById('required-count');
const hintTextEl = document.getElementById('hint-text');
const calcBtn = document.getElementById('calc-btn');
const modeSwitch = document.getElementById('mode-switch');
const keypad = document.getElementById('keypad');

// Dentro de cada submodo (Tensión / Corriente) el número de campos es fijo y
// siempre en el mismo orden — el único campo "extra" es L1-L2 (opcional, solo
// en Tensión), que no bloquea el cálculo. Por eso el teclado propio en
// pantalla sí aplica aquí, igual que en el módulo trifásico.
function renderFields(){
  const cfg = getMode(mode);
  if(buffers.length !== cfg.tags.length){
    buffers = cfg.tags.map((_, i) => buffers[i] || '');
  }
  fieldsEl.innerHTML = cfg.tags.map((tag, i) => {
    const optional = i >= cfg.requiredCount;
    return `
    <div>
      <div class="numfield" data-index="${i}"${optional ? ' style="border-style:dashed"' : ''}>
        <span class="tag">${tag}</span>
        ${optional ? '<span class="opt-pill">OPCIONAL</span>' : ''}
        <span class="value ${buffers[i] ? '' : 'placeholder'}">${buffers[i] || '0.0'}</span>
        <span class="unit">${cfg.unit}</span>
      </div>
      ${optional ? '<div class="field-hint">Opcional — verifica que la lectura corresponda a un sistema monofásico trifilar real. No bloquea el cálculo.</div>' : ''}
    </div>`;
  }).join('');
  fieldTitleEl.textContent = cfg.fieldTitle;
  requiredCountEl.textContent = cfg.requiredCount;
  hintTextEl.textContent = cfg.tags.length > cfg.requiredCount
    ? 'Toca un campo y usa el teclado inferior. Se calcula al completar L1-N y L2-N; L1-L2 es opcional.'
    : 'Toca un campo y usa el teclado inferior. Se calcula al completar las dos líneas.';
  [...fieldsEl.querySelectorAll('.numfield')].forEach(el => {
    el.addEventListener('click', () => {
      activeIndex = Number(el.dataset.index);
      updateActiveState();
    });
  });
  if(activeIndex >= cfg.tags.length) activeIndex = 0;
  updateActiveState();
}

function updateActiveState(){
  const cfg = getMode(mode);
  [...fieldsEl.querySelectorAll('.numfield')].forEach(el => {
    el.classList.toggle('focused', Number(el.dataset.index) === activeIndex);
  });
  const filledRequired = buffers.slice(0, cfg.requiredCount)
    .filter(b => b !== '' && !isNaN(parseFloat(b)) && parseFloat(b) > 0).length;
  filledCountEl.textContent = filledRequired;
  calcBtn.disabled = filledRequired < cfg.requiredCount;
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
  buffers = getMode(mode).tags.map(() => '');
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
});

calcBtn.addEventListener('click', () => {
  const cfg = getMode(mode);
  const values = buffers.slice(0, 2).map(b => parseFloat(b) || 0);
  const l1l2Raw = cfg.hasConsistencyCheck ? parseFloat(buffers[2]) : NaN;
  const l1l2 = l1l2Raw > 0 ? l1l2Raw : null;

  const result = calculate(values, mode, l1l2);

  setCurrentMeasurement({
    calculator: 'single-phase-imbalance',
    mode,
    tags: cfg.tags.slice(0, 2),
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
    l1l2,
    consistency: result.consistency,
    timestamp: new Date().toISOString()
  });
  window.location.href = 'result.html';
});

[...modeSwitch.querySelectorAll('button')].forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
renderFields();
