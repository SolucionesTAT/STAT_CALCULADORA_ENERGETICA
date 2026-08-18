// Arco de umbral reutilizable (media dona + aguja), pensado para cualquier
// calculadora futura que necesite visualizar un valor contra umbrales de estado.

const GROUP_VAR = { good: '--state-good', warn: '--state-warn', crit: '--state-crit' };

// thresholds: [{max, group}], con el último normalmente max=Infinity.
// gaugeMax: valor de la escala visual completa (extremo derecho del arco).
export function renderGauge(el, { pct, gaugeMax, thresholds, size = 196 }){
  const height = size / 2;
  el.style.width = `${size}px`;
  el.style.height = `${height}px`;
  el.style.borderRadius = `${height}px ${height}px 0 0`;

  let prevDeg = 0;
  const stops = [];
  thresholds.forEach(level => {
    const cutoff = Math.min(level.max, gaugeMax);
    const deg = Math.max(prevDeg, (cutoff / gaugeMax) * 180);
    stops.push(`var(${GROUP_VAR[level.group]}) ${prevDeg}deg ${deg}deg`);
    prevDeg = deg;
  });
  if(prevDeg < 180){
    const lastGroup = thresholds[thresholds.length - 1].group;
    stops.push(`var(${GROUP_VAR[lastGroup]}) ${prevDeg}deg 180deg`);
  }
  el.style.background = `conic-gradient(from 270deg at 50% 100%, ${stops.join(', ')})`;

  const maskInset = Math.round(size * 0.082);
  let mask = el.querySelector('.arc-mask');
  if(!mask){
    mask = document.createElement('div');
    mask.className = 'arc-mask';
    el.appendChild(mask);
  }
  mask.style.left = `${maskInset}px`;
  mask.style.right = `${maskInset}px`;
  mask.style.top = `${maskInset}px`;
  mask.style.bottom = '0';
  mask.style.borderRadius = `${height - maskInset}px ${height - maskInset}px 0 0`;

  const clamped = Math.max(0, Math.min(pct, gaugeMax));
  const rotateDeg = (clamped / gaugeMax) * 180 - 90;
  const needleHeight = height - maskInset * 0.3;
  let needle = el.querySelector('.needle');
  if(!needle){
    needle = document.createElement('div');
    needle.className = 'needle';
    el.appendChild(needle);
  }
  needle.style.width = `${Math.max(2, size * 0.015)}px`;
  needle.style.height = `${needleHeight}px`;
  needle.style.transform = `rotate(${rotateDeg}deg)`;

  const dotSize = Math.max(8, size * 0.06);
  let dot = el.querySelector('.needle-dot');
  if(!dot){
    dot = document.createElement('div');
    dot.className = 'needle-dot';
    el.appendChild(dot);
  }
  dot.style.width = `${dotSize}px`;
  dot.style.height = `${dotSize}px`;
  dot.style.bottom = `${-dotSize / 3}px`;
}
