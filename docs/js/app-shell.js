// Componentes compartidos de shell: registro del service worker y botón "Instalar app".
import { applyTheme } from './storage.js';

applyTheme();

if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    const base = document.body.dataset.base || '.';
    navigator.serviceWorker.register(`${base}/service-worker.js`).catch(() => {});
  });
}

// Si la app ya corre instalada (abierta desde el ícono de inicio, no del navegador),
// nunca tiene sentido ofrecer instalarla de nuevo.
const runningStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  if(runningStandalone) return;
  deferredInstallPrompt = event;
  const banner = document.getElementById('install-banner');
  if(banner) banner.classList.add('visible');
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const banner = document.getElementById('install-banner');
  if(banner) banner.classList.remove('visible');
});

document.addEventListener('DOMContentLoaded', () => {
  const installBtn = document.getElementById('install-btn');
  if(!installBtn) return;
  installBtn.addEventListener('click', async () => {
    if(!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    const banner = document.getElementById('install-banner');
    if(banner) banner.classList.remove('visible');
  });
});
