import { ROD_DIAMETERS, IEC_SENSITIVITIES, calculate } from './logic.js';
import { setCurrentMeasurement } from '../../js/storage.js';

let soilKnown = true;
let diameterId = '5/8';
let useIEC = false;
let iDeltaMa = null;

const soilSwitch = document.getElementById('soil-switch');
const resistivityBlock = document.getElementById('resistivity-block');
const wennerBlock = document.getElementById('wenner-block');
const resistivityInput = document.getElementById('resistivity-input');
const wennerAInput = document.getElementById('wenner-a-input');
const wennerRInput = document.getElementById('wenner-r-input');
const lengthInput = document.getElementById('length-input');
const diameterSwitch = document.getElementById('diameter-switch');
const diameterOtherBlock = document.getElementById('diameter-other-block');
const diameterInput = document.getElementById('diameter-input');
const iecToggleBtn = document.getElementById('iec-toggle-btn');
const iecChevron = document.getElementById('iec-chevron');
const iecPanel = document.getElementById('iec-panel');
const ideltaSwitch = document.getElementById('idelta-switch');
const calcBtn = document.getElementById('calc-btn');

soilSwitch.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-known]');
  if(!btn) return;
  soilKnown = btn.dataset.known === 'yes';
  [...soilSwitch.querySelectorAll('button')].forEach(b => b.classList.toggle('active', b === btn));
  resistivityBlock.style.display = soilKnown ? 'block' : 'none';
  wennerBlock.style.display = soilKnown ? 'none' : 'block';
  validate();
});

diameterSwitch.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-diameter]');
  if(!btn) return;
  diameterId = btn.dataset.diameter;
  [...diameterSwitch.querySelectorAll('button')].forEach(b => b.classList.toggle('active', b === btn));
  diameterOtherBlock.style.display = diameterId === 'other' ? 'block' : 'none';
  validate();
});

iecToggleBtn.addEventListener('click', () => {
  useIEC = iecPanel.style.display === 'none';
  iecPanel.style.display = useIEC ? 'block' : 'none';
  iecChevron.style.transform = useIEC ? 'rotate(90deg)' : 'rotate(0deg)';
  validate();
});

ideltaSwitch.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-ma]');
  if(!btn) return;
  iDeltaMa = Number(btn.dataset.ma);
  [...ideltaSwitch.querySelectorAll('button')].forEach(b => b.classList.toggle('active', b === btn));
  validate();
});

[resistivityInput, wennerAInput, wennerRInput, lengthInput, diameterInput].forEach(el => {
  el.addEventListener('input', validate);
});

function getDiameterMeters(){
  if(diameterId === 'other') return parseFloat(diameterInput.value) || 0;
  return ROD_DIAMETERS.find(d => d.id === diameterId).meters;
}

function validate(){
  const soilOk = soilKnown
    ? parseFloat(resistivityInput.value) > 0
    : parseFloat(wennerAInput.value) > 0 && parseFloat(wennerRInput.value) > 0;
  const lengthOk = parseFloat(lengthInput.value) > 0;
  const diameterOk = getDiameterMeters() > 0;
  const iecOk = !useIEC || iDeltaMa !== null;
  calcBtn.disabled = !(soilOk && lengthOk && diameterOk && iecOk);
}

calcBtn.addEventListener('click', () => {
  const diameterMeters = getDiameterMeters();
  const diameterLabel = diameterId === 'other'
    ? `${diameterInput.value} m`
    : ROD_DIAMETERS.find(d => d.id === diameterId).label;

  const input = {
    soilKnown,
    resistivity: soilKnown ? parseFloat(resistivityInput.value) : null,
    wennerA: soilKnown ? null : parseFloat(wennerAInput.value),
    wennerR: soilKnown ? null : parseFloat(wennerRInput.value),
    length: parseFloat(lengthInput.value),
    diameterM: diameterMeters,
    useIEC,
    iDeltaAmps: useIEC ? IEC_SENSITIVITIES.find(s => s.id === iDeltaMa).amps : null
  };

  const result = calculate(input);

  setCurrentMeasurement({
    calculator: 'grounding',
    soilKnown,
    wennerA: input.wennerA,
    wennerR: input.wennerR,
    resistivity: result.resistivity,
    length: input.length,
    diameterLabel,
    resistance: result.resistance,
    useIEC,
    iDeltaMa: useIEC ? iDeltaMa : null,
    evaluation: result.evaluation,
    necReference: result.necReference,
    status: { group: result.evaluation.group, label: result.evaluation.label },
    timestamp: new Date().toISOString()
  });
  window.location.href = 'result.html';
});

validate();
