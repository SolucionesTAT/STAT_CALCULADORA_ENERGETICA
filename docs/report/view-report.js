import { getCurrentMeasurement, getHistoryEntry, getSettings } from '../js/storage.js';

const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const m = id ? getHistoryEntry(id) : getCurrentMeasurement();

const slot = document.getElementById('report-slot');
if(!m){
  slot.innerHTML = `<div class="empty-state">No hay una medición para mostrar. Vuelve a la calculadora y genera un resultado primero.</div>`;
}else{
  render(m);
}

function render(m){
  const decimals = getSettings().decimals ?? 2;
  const date = new Date(m.timestamp);
  const dateLabel = date.toLocaleDateString('es-EC') + ' ' + date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
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
      <div class="report-head">
        <img src="../assets/brand/stat-mark-onwhite.jpg" alt="STAT">
        <div class="company">
          <div class="name">STAT · SERVICIOS ELÉCTRICOS</div>
          <div class="site">stat.com.ec · Ecuador</div>
          <img src="../assets/brand/stat-tagline.png" alt="It's for life">
        </div>
      </div>

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

      ${m.notes ? `
      <div class="report-notes">
        <div class="k" style="font:600 9px var(--font-sans); letter-spacing:.09em; color:var(--text-tertiary)">OBSERVACIONES</div>
        <div class="body">${escapeHtml(m.notes)}</div>
      </div>` : ''}

      <div class="report-footer">Generado con STAT Calculadora Energética. Desviación máxima respecto al promedio de las tres ${m.mode === 'voltage' ? 'tensiones' : 'corrientes'} de línea (metodología NEMA MG-1).</div>
    </div>`;

  document.getElementById('print-btn').addEventListener('click', () => window.print());
  document.getElementById('share-btn').addEventListener('click', async () => {
    const text = `Reporte STAT — Desbalance de ${modeLabel}\n${m.board ? m.board + '\n' : ''}Desbalance: ${m.pct.toFixed(decimals)}% (${m.status.label})\nPromedio: ${m.avg.toFixed(decimals)} ${m.unit}\n${dateLabel}`;
    if(navigator.share){
      try{ await navigator.share({ title: 'Reporte STAT', text }); }catch(e){ /* cancelado */ }
    }else if(navigator.clipboard){
      await navigator.clipboard.writeText(text);
    }
  });
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
