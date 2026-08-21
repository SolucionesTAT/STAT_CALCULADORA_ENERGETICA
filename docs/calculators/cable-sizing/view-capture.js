import { calculate } from './logic.js';
import { setCurrentMeasurement, getCurrentMeasurement } from '../../js/storage.js';

// Solo se precarga si se llegó con ?edit=1 (botón del lápiz en Resultado) —
// la flecha de regresar o el atrás del navegador deben dejar los campos
// vacíos.
const isEdit = new URLSearchParams(window.location.search).get('edit') === '1';
const previousRaw = getCurrentMeasurement();
const previous = isEdit && previousRaw && previousRaw.calculator === 'cable-sizing' ? previousRaw : null;
let method = previous ? previous.method : 'ducto';

const methodSwitch = document.getElementById('method-switch');
const currentInput = document.getElementById('current-input');
const ambientInput = document.getElementById('ambient-input');
const groupInput = document.getElementById('group-input');
const lengthInput = document.getElementById('length-input');
const voltageInput = document.getElementById('voltage-input');
const calcBtn = document.getElementById('calc-btn');

if(previous){
  currentInput.value = String(previous.currentA);
  ambientInput.value = String(previous.ambientC);
  groupInput.value = String(previous.groupCount);
  lengthInput.value = String(previous.lengthM);
  voltageInput.value = String(previous.voltageV);
  [...methodSwitch.querySelectorAll('button')].forEach(b => b.classList.toggle('active', b.dataset.method === method));
}

// <input type="text" inputmode="decimal"> en vez de type="number": el
// teclado decimal del sistema en español solo ofrece "," y type="number"
// exige "." internamente sin importar la tecla — con type="text" aceptamos
// lo que sea y normalizamos acá (mismo patrón que Puesta a Tierra).
function normalizeDecimalInput(el){
  el.addEventListener('input', () => {
    let v = el.value.replace(',', '.').replace(/[^\d.]/g, '');
    const firstDot = v.indexOf('.');
    if(firstDot !== -1){
      v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
    }
    if(v !== el.value) el.value = v;
    validate();
  });
}

[currentInput, ambientInput, groupInput, lengthInput, voltageInput].forEach(normalizeDecimalInput);

function parseDecimal(str){
  return parseFloat(String(str).replace(',', '.'));
}

methodSwitch.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-method]');
  if(!btn) return;
  method = btn.dataset.method;
  [...methodSwitch.querySelectorAll('button')].forEach(b => b.classList.toggle('active', b === btn));
  validate();
});

function validate(){
  const ok = parseDecimal(currentInput.value) > 0 &&
    parseDecimal(ambientInput.value) !== undefined && ambientInput.value !== '' &&
    parseDecimal(groupInput.value) >= 1 &&
    parseDecimal(lengthInput.value) > 0 &&
    parseDecimal(voltageInput.value) > 0;
  calcBtn.disabled = !ok;
}

calcBtn.addEventListener('click', () => {
  const input = {
    currentA: parseDecimal(currentInput.value),
    method,
    ambientC: parseDecimal(ambientInput.value),
    groupCount: Math.round(parseDecimal(groupInput.value)),
    lengthM: parseDecimal(lengthInput.value),
    voltageV: parseDecimal(voltageInput.value)
  };

  const result = calculate(input);

  setCurrentMeasurement({
    calculator: 'cable-sizing',
    ...input,
    ...result,
    timestamp: new Date().toISOString()
  });
  window.location.href = 'result.html';
});

validate();
