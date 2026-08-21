import { getCurrentMeasurement, getHistoryEntry, getSettings } from '../js/storage.js';

const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const m = id ? getHistoryEntry(id) : getCurrentMeasurement();

// Cerrar debe volver a donde el usuario vino (Historial o Resultado), no
// siempre a Inicio — si no hay una pantalla previa en este mismo flujo
// (p. ej. se abrió el reporte directo), Inicio queda como respaldo.
document.getElementById('close-btn').addEventListener('click', () => {
  if(window.history.length > 1){
    window.history.back();
  }else{
    window.location.href = '../index.html';
  }
});

const slot = document.getElementById('report-slot');
if(!m){
  slot.innerHTML = `<div class="empty-state">No hay una medición para mostrar. Vuelve a la calculadora y genera un resultado primero.</div>`;
}else{
  const calculator = m.calculator || 'imbalance';
  const decimals = getSettings().decimals ?? 2;
  const date = new Date(m.timestamp);
  const dateLabel = date.toLocaleDateString('es-EC') + ' ' + date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

  let shareText;
  if(calculator === 'grounding'){
    shareText = renderGrounding(m, decimals, dateLabel);
  }else if(calculator === 'single-phase-imbalance'){
    shareText = renderSinglePhase(m, decimals, dateLabel);
  }else if(calculator === 'cable-sizing'){
    shareText = renderCableSizing(m, decimals, dateLabel);
  }else{
    shareText = renderImbalance(m, decimals, dateLabel);
  }

  document.getElementById('print-btn').addEventListener('click', () => window.print());
  document.getElementById('share-btn').addEventListener('click', async () => {
    if(navigator.share){
      try{ await navigator.share({ title: 'Reporte STAT', text: shareText }); }catch(e){ /* cancelado */ }
    }else if(navigator.clipboard){
      await navigator.clipboard.writeText(shareText);
    }
  });
}

function renderImbalance(m, decimals, dateLabel){
  const modeLabel = m.mode === 'voltage' ? 'tensión' : 'corriente';

  const rows = m.tags.map((tag, i) => {
    const dev = m.deviations[i];
    const sign = dev > 0 ? '+' : (dev < 0 ? '−' : '');
    return `
      <div class="row">
        <div class="cell col-line">${tag}</div>
        <div class="cell col-val">${m.values[i].toFixed(decimals)} ${m.unit}</div>
        <div class="cell col-dev" style="color:${dev >= 0 ? 'var(--state-warn)' : 'var(--text-secondary)'}">${sign}${Math.abs(dev).toFixed(decimals)}</div>
      </div>`;
  }).join('');

  slot.innerHTML = `
    <div class="report-sheet">
      ${reportHead()}

      <div class="report-title">Desbalance de ${modeLabel} trifásico</div>

      <div class="report-grid">
        <div><div class="k">TABLERO / EQUIPO</div><div class="v">${m.board || '—'}</div></div>
        <div><div class="k">FECHA Y HORA</div><div class="v" style="font-family:var(--font-mono)">${dateLabel}</div></div>
        <div><div class="k">TÉCNICO</div><div class="v">${m.technician || '—'}</div></div>
        <div><div class="k">REFERENCIA</div><div class="v">${m.reference}</div></div>
      </div>

      <div class="report-table">
        <div class="thead">
          <div class="col-line">LÍNEA</div><div class="col-val">MEDIDO</div><div class="col-dev">DESV.</div>
        </div>
        ${rows}
      </div>

      <div class="report-result" style="background:var(--state-${m.status.group}-bg); border:1px solid var(--state-${m.status.group}-border)">
        <div>
          <div class="k" style="font:600 9px var(--font-sans); letter-spacing:.09em; color:var(--state-${m.status.group})">DESBALANCE</div>
          <div class="pct">${m.pct.toFixed(decimals)} %</div>
        </div>
        <div class="side">
          <span class="badge badge-pill" style="background:var(--state-${m.status.group}); color:#fff"><span>${m.status.label}</span></span>
        </div>
      </div>

      <div class="report-grid" style="margin-top:11px">
        <div><div class="k">PROMEDIO</div><div class="v" style="font-family:var(--font-mono)">${m.avg.toFixed(decimals)} ${m.unit}</div></div>
        <div><div class="k">MÁX / MÍN</div><div class="v" style="font-family:var(--font-mono)">${m.max.toFixed(1)} / ${m.min.toFixed(1)}</div></div>
      </div>

      ${notesBlock(m)}

      <div class="report-footer">Generado con STAT Calculadora Energética. Desviación máxima respecto al promedio de las tres ${m.mode === 'voltage' ? 'tensiones' : 'corrientes'} de línea (metodología NEMA MG-1).</div>
    </div>`;

  return `Reporte STAT — Desbalance de ${modeLabel}\n${m.board ? m.board + '\n' : ''}Desbalance: ${m.pct.toFixed(decimals)}% (${m.status.label})\nPromedio: ${m.avg.toFixed(decimals)} ${m.unit}\n${dateLabel}`;
}

function renderSinglePhase(m, decimals, dateLabel){
  const modeLabel = m.mode === 'voltage' ? 'tensión' : 'corriente';

  const rows = m.tags.map((tag, i) => {
    const dev = m.deviations[i];
    const sign = dev > 0 ? '+' : (dev < 0 ? '−' : '');
    return `
      <div class="row">
        <div class="cell col-line">${tag}</div>
        <div class="cell col-val">${m.values[i].toFixed(decimals)} ${m.unit}</div>
        <div class="cell col-dev" style="color:${dev >= 0 ? 'var(--state-warn)' : 'var(--text-secondary)'}">${sign}${Math.abs(dev).toFixed(decimals)}</div>
      </div>`;
  }).join('');

  const consistencyRow = m.consistency ? `
      <div><div class="k">VALIDACIÓN L1-L2</div><div class="v" style="font-family:var(--font-mono)">${m.consistency.measured.toFixed(decimals)} V (esperado ${m.consistency.expected.toFixed(decimals)} V) — ${m.consistency.ok ? 'coherente' : 'revisar lectura'}</div></div>` : '';

  slot.innerHTML = `
    <div class="report-sheet">
      ${reportHead()}

      <div class="report-title">Desbalance de ${modeLabel} — monofásico trifilar</div>

      <div class="report-grid">
        <div><div class="k">TABLERO / EQUIPO</div><div class="v">${m.board || '—'}</div></div>
        <div><div class="k">FECHA Y HORA</div><div class="v" style="font-family:var(--font-mono)">${dateLabel}</div></div>
        <div><div class="k">TÉCNICO</div><div class="v">${m.technician || '—'}</div></div>
        <div><div class="k">REFERENCIA</div><div class="v">${m.reference}</div></div>
        ${consistencyRow}
      </div>

      <div class="report-table">
        <div class="thead">
          <div class="col-line">LÍNEA</div><div class="col-val">MEDIDO</div><div class="col-dev">DESV.</div>
        </div>
        ${rows}
      </div>

      <div class="report-result" style="background:var(--state-${m.status.group}-bg); border:1px solid var(--state-${m.status.group}-border)">
        <div>
          <div class="k" style="font:600 9px var(--font-sans); letter-spacing:.09em; color:var(--state-${m.status.group})">DESBALANCE</div>
          <div class="pct">${m.pct.toFixed(decimals)} %</div>
        </div>
        <div class="side">
          <span class="badge badge-pill" style="background:var(--state-${m.status.group}); color:#fff"><span>${m.status.label}</span></span>
        </div>
      </div>

      <div class="report-grid" style="margin-top:11px">
        <div><div class="k">PROMEDIO</div><div class="v" style="font-family:var(--font-mono)">${m.avg.toFixed(decimals)} ${m.unit}</div></div>
        <div><div class="k">MÁX / MÍN</div><div class="v" style="font-family:var(--font-mono)">${m.max.toFixed(1)} / ${m.min.toFixed(1)}</div></div>
      </div>

      ${notesBlock(m)}

      <div class="report-footer">Generado con STAT Calculadora Energética. Desviación máxima respecto al promedio de las dos líneas de un sistema monofásico trifilar (criterio operativo de STAT, no corresponde a NEMA MG-1 — esa norma es de motores trifásicos).</div>
    </div>`;

  return `Reporte STAT — Desbalance monofásico de ${modeLabel}\n${m.board ? m.board + '\n' : ''}Desbalance: ${m.pct.toFixed(decimals)}% (${m.status.label})\nPromedio: ${m.avg.toFixed(decimals)} ${m.unit}\n${dateLabel}`;
}

function renderCableSizing(m, decimals, dateLabel){
  const methodLabel = m.method === 'ducto' ? 'Ducto/canalización' : 'Aire libre';
  const sizeText = m.ok ? `${m.mm2} mm² (≈ ${m.awg})` : 'Sin calibre válido';
  const determinantText = !m.ok
    ? (m.reason === 'ampacidad' ? 'Ningún calibre de la tabla soporta esta corriente con las condiciones dadas' : 'La caída de tensión supera el umbral incluso en el calibre más grande de la tabla')
    : (m.determinant === 'ampacidad' ? 'Determinado por ampacidad' : `Determinado por caída de tensión (ampacidad ya cumplía en ${m.ampacitySize} mm²)`);

  const criteriaRows = m.ok ? `
      <div><div class="k">AMPACIDAD CORREGIDA (Iz)</div><div class="v" style="font-family:var(--font-mono)">${m.izCorrected.toFixed(decimals)} A ≥ ${m.currentA.toFixed(decimals)} A</div></div>
      <div><div class="k">CAÍDA DE TENSIÓN</div><div class="v" style="font-family:var(--font-mono)">${m.pctDrop.toFixed(decimals)} %</div></div>` : '';

  slot.innerHTML = `
    <div class="report-sheet">
      ${reportHead()}

      <div class="report-title">Dimensionamiento de cables — monofásico, cobre</div>

      <div class="report-grid">
        <div><div class="k">TABLERO / EQUIPO</div><div class="v">${m.board || '—'}</div></div>
        <div><div class="k">FECHA Y HORA</div><div class="v" style="font-family:var(--font-mono)">${dateLabel}</div></div>
        <div><div class="k">TÉCNICO</div><div class="v">${m.technician || '—'}</div></div>
        <div><div class="k">REFERENCIA</div><div class="v">IEC 60364-5-52 (ampacidad) · umbral práctico de caída ≤3%</div></div>
      </div>

      <div class="report-grid" style="margin-top:11px">
        <div><div class="k">CORRIENTE DE DISEÑO</div><div class="v" style="font-family:var(--font-mono)">${m.currentA.toFixed(decimals)} A</div></div>
        <div><div class="k">MÉTODO</div><div class="v">${methodLabel}</div></div>
        <div><div class="k">TEMPERATURA AMBIENTE</div><div class="v" style="font-family:var(--font-mono)">${m.ambientC.toFixed(1)} °C</div></div>
        <div><div class="k">CONDUCTORES AGRUPADOS</div><div class="v" style="font-family:var(--font-mono)">${m.groupCount}</div></div>
        <div><div class="k">LONGITUD DEL TRAMO</div><div class="v" style="font-family:var(--font-mono)">${m.lengthM.toFixed(decimals)} m</div></div>
        <div><div class="k">VOLTAJE DEL SISTEMA</div><div class="v" style="font-family:var(--font-mono)">${m.voltageV.toFixed(decimals)} V</div></div>
        ${criteriaRows}
      </div>

      <div class="report-result" style="background:var(--state-${m.status.group}-bg); border:1px solid var(--state-${m.status.group}-border)">
        <div>
          <div class="k" style="font:600 9px var(--font-sans); letter-spacing:.09em; color:var(--state-${m.status.group})">CALIBRE MÍNIMO</div>
          <div class="pct" style="font-size:24px">${sizeText}</div>
        </div>
        <div class="side">
          <span class="badge badge-pill" style="background:var(--state-${m.status.group}); color:#fff"><span>${m.status.label}</span></span>
        </div>
      </div>

      <div class="report-notes">
        <div class="k" style="font:600 9px var(--font-sans); letter-spacing:.09em; color:var(--text-tertiary)">CRITERIO DETERMINANTE</div>
        <div class="body">${determinantText}</div>
      </div>

      ${notesBlock(m)}

      <div class="report-footer">Generado con STAT Calculadora Energética. Calibre mínimo que cumple ampacidad (IEC 60364-5-52, tabla B.52.2, cobre, 2 conductores, PVC 70°C) y caída de tensión (umbral práctico ≤3%, no impuesto por IEC 60364-5-52). v1: solo cobre, solo circuitos monofásicos.</div>
    </div>`;

  return `Reporte STAT — Dimensionamiento de cables\n${m.board ? m.board + '\n' : ''}Calibre: ${sizeText} (${m.status.label})\nCorriente: ${m.currentA.toFixed(decimals)} A · Método: ${methodLabel}\n${dateLabel}`;
}

function renderGrounding(m, decimals, dateLabel){
  const extraRows = !m.soilKnown ? `
      <div><div class="k">ESPACIAMIENTO (a)</div><div class="v" style="font-family:var(--font-mono)">${m.wennerA.toFixed(decimals)} m</div></div>
      <div><div class="k">LECTURA TELURÓMETRO (R)</div><div class="v" style="font-family:var(--font-mono)">${m.wennerR.toFixed(decimals)} Ω</div></div>` : '';
  const iecRow = m.useIEC ? `
      <div><div class="k">SENSIBILIDAD (IΔn)</div><div class="v" style="font-family:var(--font-mono)">${m.iDeltaMa} mA</div></div>` : '';
  const necRefRow = m.useIEC && m.necReference ? `
      <div><div class="k">REF. NEC 250.53</div><div class="v" style="font-family:var(--font-mono)">≤ ${m.necReference.limitOhms} Ω (${m.necReference.label})</div></div>` : '';

  slot.innerHTML = `
    <div class="report-sheet">
      ${reportHead()}

      <div class="report-title">Puesta a tierra — electrodo vertical</div>

      <div class="report-grid">
        <div><div class="k">TABLERO / EQUIPO</div><div class="v">${m.board || '—'}</div></div>
        <div><div class="k">FECHA Y HORA</div><div class="v" style="font-family:var(--font-mono)">${dateLabel}</div></div>
        <div><div class="k">TÉCNICO</div><div class="v">${m.technician || '—'}</div></div>
        <div><div class="k">CRITERIO</div><div class="v">${m.evaluation.criterion}</div></div>
      </div>

      <div class="report-grid" style="margin-top:11px">
        <div><div class="k">RESISTIVIDAD (ρ)</div><div class="v" style="font-family:var(--font-mono)">${m.resistivity.toFixed(decimals)} Ω·m</div></div>
        <div><div class="k">LONGITUD (L)</div><div class="v" style="font-family:var(--font-mono)">${m.length.toFixed(decimals)} m</div></div>
        <div><div class="k">DIÁMETRO (d)</div><div class="v">${m.diameterLabel}</div></div>
        ${extraRows}
        ${iecRow}
        ${necRefRow}
      </div>

      <div class="report-result" style="background:var(--state-${m.status.group}-bg); border:1px solid var(--state-${m.status.group}-border)">
        <div>
          <div class="k" style="font:600 9px var(--font-sans); letter-spacing:.09em; color:var(--state-${m.status.group})">RESISTENCIA</div>
          <div class="pct">${m.resistance.toFixed(decimals)} Ω</div>
        </div>
        <div class="side">
          <span class="badge badge-pill" style="background:var(--state-${m.status.group}); color:#fff"><span>${m.status.label}</span></span>
        </div>
      </div>

      ${!m.evaluation.pass ? `
      <div class="report-notes">
        <div class="k" style="font:600 9px var(--font-sans); letter-spacing:.09em; color:var(--state-crit)">RECOMENDACIÓN</div>
        <div class="body">Instalar un electrodo adicional (NEC 250.53(A)(2)), separación mínima 1.8 m (6 pies) entre electrodos.</div>
      </div>` : ''}

      ${notesBlock(m)}

      <div class="report-footer">Generado con STAT Calculadora Energética. Resistencia de electrodo vertical calculada con la fórmula de Dwight.</div>
    </div>`;

  return `Reporte STAT — Puesta a tierra\n${m.board ? m.board + '\n' : ''}Resistencia: ${m.resistance.toFixed(decimals)} Ω (${m.status.label})\nCriterio: ${m.evaluation.criterion}\n${dateLabel}`;
}

function reportHead(){
  return `
      <div class="report-head">
        <img src="../assets/brand/stat-mark-onwhite.jpg" alt="STAT">
        <div class="company">
          <div class="name">STAT · SERVICIOS ELÉCTRICOS</div>
          <div class="site">stat.com.ec · Ecuador</div>
          <img src="../assets/brand/stat-tagline.png" alt="It's for life">
        </div>
      </div>`;
}

function notesBlock(m){
  if(!m.notes) return '';
  return `
      <div class="report-notes">
        <div class="k" style="font:600 9px var(--font-sans); letter-spacing:.09em; color:var(--text-tertiary)">OBSERVACIONES</div>
        <div class="body">${escapeHtml(m.notes)}</div>
      </div>`;
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
