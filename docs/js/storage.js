// Persistencia 100% local (localStorage). Sin backend, sin sincronización — ver CLAUDE.md.

const KEY_HISTORY = 'stat-calc:history';
const KEY_SETTINGS = 'stat-calc:settings';
const KEY_CURRENT = 'stat-calc:current-measurement';

const DEFAULT_SETTINGS = {
  theme: 'dark',       // 'dark' | 'light' | 'auto'
  decimals: 2,
  technician: ''
};

function readJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch(e){
    return fallback;
  }
}

function writeJSON(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

export function getSettings(){
  return { ...DEFAULT_SETTINGS, ...readJSON(KEY_SETTINGS, {}) };
}

export function saveSettings(partial){
  const next = { ...getSettings(), ...partial };
  writeJSON(KEY_SETTINGS, next);
  return next;
}

export function applyTheme(){
  const { theme } = getSettings();
  if(theme === 'auto'){
    document.documentElement.removeAttribute('data-theme');
  }else{
    document.documentElement.setAttribute('data-theme', theme);
  }
}

// Tema realmente visible ahora mismo, resolviendo 'auto' contra la preferencia del sistema.
export function getEffectiveTheme(){
  const { theme } = getSettings();
  if(theme !== 'auto') return theme;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Alterna entre oscuro y claro de forma explícita (sale de 'auto' si estaba activo).
export function toggleTheme(){
  const next = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
  saveSettings({ theme: next });
  applyTheme();
  return next;
}

export function getHistory(){
  return readJSON(KEY_HISTORY, []);
}

export function addHistoryEntry(entry){
  const history = getHistory();
  const record = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...entry };
  history.unshift(record);
  writeJSON(KEY_HISTORY, history);
  return record;
}

export function getHistoryEntry(id){
  return getHistory().find(h => h.id === id) || null;
}

export function deleteHistoryEntry(id){
  writeJSON(KEY_HISTORY, getHistory().filter(h => h.id !== id));
}

export function clearHistory(){
  writeJSON(KEY_HISTORY, []);
}

// Estado transitorio para pasar la medición actual entre pantallas (Captura -> Resultado -> Reporte).
// No es historial: vive en sessionStorage y se sobrescribe en cada cálculo nuevo.
export function setCurrentMeasurement(data){
  sessionStorage.setItem(KEY_CURRENT, JSON.stringify(data));
}

export function getCurrentMeasurement(){
  try{
    const raw = sessionStorage.getItem(KEY_CURRENT);
    return raw ? JSON.parse(raw) : null;
  }catch(e){
    return null;
  }
}
