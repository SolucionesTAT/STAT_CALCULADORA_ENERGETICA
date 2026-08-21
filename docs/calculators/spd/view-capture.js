import { LOCATIONS, VOLTAGE_PRESETS, EXPOSURE_LEVELS, calculate } from './logic.js';
import { setCurrentMeasurement, getCurrentMeasurement } from '../../js/storage.js';

// Solo se precarga si se llegó con ?edit=1 (botón "Editar" en Resultado) —
// la flecha de regresar o el atrás del navegador deben dejar los campos
// vacíos, mismo patrón que el resto de las calculadoras.
const isEdit = new URLSearchParams(window.location.search).get('edit') === '1';
const previousRaw = getCurrentMeasurement();
const previous = isEdit && previousRaw && previousRaw.calculator === 'spd' ? previousRaw : null;

let locationId = previous ? previous.locationId : null;
let voltageIsOther = previous ? !VOLTAGE_PRESETS.includes(previous.voltageNominal) : false;
let voltageNominal = previous && !voltageIsOther ? previous.voltageNominal : null;
let exposureId = previous ? previous.exposureId : null;

const locationOptionsEl = document.getElementById('location-options');
const voltageOptionsEl = document.getElementById('voltage-options');
const voltageOtherBlock = document.getElementById('voltage-other-block');
const voltageOtherInput = document.getElementById('voltage-other-input');
const exposureSwitch = document.getElementById('exposure-switch');
const calcBtn = document.getElementById('calc-btn');

function parseDecimal(str){
  return parseFloat(String(str).replace(',', '.'));
}

// Sin adelantar el Tipo recomendado aquí a propósito — eso debe aparecer
// solo en el resultado, después de calcular, no como pista junto a cada
// opción antes de elegir.
locationOptionsEl.innerHTML = LOCATIONS.map(loc => `
  <button type="button" class="option-card${loc.id === locationId ? ' active' : ''}" data-location="${loc.id}">
    <div class="option-title">${loc.label}</div>
  </button>
`).join('');

voltageOptionsEl.innerHTML = VOLTAGE_PRESETS.map(v => `
  <button type="button" class="filter-chip${!voltageIsOther && v === voltageNominal ? ' active' : ''}" data-voltage="${v}">${v}V</button>
`).join('') + `<button type="button" class="filter-chip${voltageIsOther ? ' active' : ''}" data-voltage="other">Otro</button>`;

exposureSwitch.innerHTML = EXPOSURE_LEVELS.map(ex => `
  <button type="button"${ex.id === exposureId ? ' class="active"' : ''} data-exposure="${ex.id}">${ex.label}</button>
`).join('');

if(voltageIsOther){
  voltageOtherBlock.style.display = 'block';
  voltageOtherInput.value = String(previous.voltageNominal);
}

locationOptionsEl.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-location]');
  if(!btn) return;
  locationId = btn.dataset.location;
  [...locationOptionsEl.querySelectorAll('button')].forEach(b => b.classList.toggle('active', b === btn));
  validate();
});

voltageOptionsEl.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-voltage]');
  if(!btn) return;
  voltageIsOther = btn.dataset.voltage === 'other';
  voltageNominal = voltageIsOther ? null : Number(btn.dataset.voltage);
  [...voltageOptionsEl.querySelectorAll('button')].forEach(b => b.classList.toggle('active', b === btn));
  voltageOtherBlock.style.display = voltageIsOther ? 'block' : 'none';
  validate();
});

voltageOtherInput.addEventListener('input', () => {
  let v = voltageOtherInput.value.replace(',', '.').replace(/[^\d.]/g, '');
  const firstDot = v.indexOf('.');
  if(firstDot !== -1) v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
  if(v !== voltageOtherInput.value) voltageOtherInput.value = v;
  validate();
});

exposureSwitch.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-exposure]');
  if(!btn) return;
  exposureId = btn.dataset.exposure;
  [...exposureSwitch.querySelectorAll('button')].forEach(b => b.classList.toggle('active', b === btn));
  validate();
});

function getVoltageValue(){
  return voltageIsOther ? parseDecimal(voltageOtherInput.value) : voltageNominal;
}

function validate(){
  const voltageOk = getVoltageValue() > 0;
  calcBtn.disabled = !(locationId && voltageOk && exposureId);
}

calcBtn.addEventListener('click', () => {
  const input = { locationId, voltageNominal: getVoltageValue(), exposureId };
  const result = calculate(input);

  setCurrentMeasurement({
    calculator: 'spd',
    ...result,
    timestamp: new Date().toISOString()
  });
  window.location.href = 'result.html';
});

validate();
