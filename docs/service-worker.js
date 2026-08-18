// Service worker de STAT Calculadora Energética.
// Cachea todos los assets propios para funcionamiento 100% offline.
// Sube este número cada vez que cambien los archivos listados abajo, para
// forzar la actualización del cache en los dispositivos ya instalados.
const CACHE_VERSION = 'stat-calc-v1';

const PRECACHE_URLS = [
  './',
  'index.html',
  'manifest.json',
  'css/tokens.css',
  'css/base.css',
  'js/app-shell.js',
  'js/gauge.js',
  'js/storage.js',
  'calculators/imbalance/index.html',
  'calculators/imbalance/result.html',
  'calculators/imbalance/logic.js',
  'calculators/imbalance/view-capture.js',
  'calculators/imbalance/view-result.js',
  'report/index.html',
  'report/view-report.js',
  'history/index.html',
  'history/view-history.js',
  'about/index.html',
  'about/privacidad.html',
  'about/view-about.js',
  'assets/brand/stat-mark-oncharcoal.jpg',
  'assets/brand/stat-mark-onwhite.jpg',
  'assets/brand/stat-tagline.png',
  'assets/icons/favicon-16.png',
  'assets/icons/favicon-32.png',
  'assets/icons/icon-72.png',
  'assets/icons/icon-96.png',
  'assets/icons/icon-128.png',
  'assets/icons/icon-144.png',
  'assets/icons/icon-152.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-384.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-192.png',
  'assets/icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if(request.method !== 'GET') return;

  const url = new URL(request.url);

  if(url.origin === self.location.origin){
    // Assets propios: cache primero, con actualización en segundo plano.
    event.respondWith(
      caches.match(request).then(cached => {
        const network = fetch(request).then(response => {
          if(response.ok){
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }else{
    // Recursos externos (p. ej. Google Fonts): red primero, cache como respaldo offline.
    event.respondWith(
      fetch(request).then(response => {
        if(response.ok){
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match(request))
    );
  }
});
