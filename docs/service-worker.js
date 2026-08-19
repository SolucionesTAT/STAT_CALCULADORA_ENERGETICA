// Service worker de STAT Calculadora Energética.
// Cachea todos los assets propios para funcionamiento 100% offline.
// Sube este número cada vez que cambien los archivos listados abajo, para
// forzar la actualización del cache en los dispositivos ya instalados.
const CACHE_VERSION = 'stat-calc-v4';

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
  'calculators/grounding/index.html',
  'calculators/grounding/result.html',
  'calculators/grounding/logic.js',
  'calculators/grounding/view-capture.js',
  'calculators/grounding/view-result.js',
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
  // Se precachea archivo por archivo (no con cache.addAll) a propósito:
  // addAll es todo-o-nada — si un solo archivo falla al buscarlo, no se
  // precachea NINGUNO. Cacheando uno por uno, una falla puntual no tumba
  // el precacheo del resto.
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => Promise.all(
        PRECACHE_URLS.map(url => cache.add(url).catch(err => {
          console.error('No se pudo precachear', url, err);
        }))
      ))
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
    event.respondWith(handleSameOrigin(request));
  }else{
    event.respondWith(handleCrossOrigin(request));
  }
});

// Assets propios: cache primero (ignorando parámetros de consulta, p. ej.
// report/index.html?id=... debe servir el mismo archivo cacheado), con
// actualización en segundo plano. Si no hay cache ni red, responde con un
// error explícito — respondWith nunca debe recibir undefined/null.
async function handleSameOrigin(request){
  const cached = await caches.match(request, { ignoreSearch: true });
  if(cached){
    fetch(request).then(response => {
      if(response && response.ok){
        caches.open(CACHE_VERSION).then(cache => cache.put(request, response.clone()));
      }
    }).catch(() => {});
    return cached;
  }
  try{
    const response = await fetch(request);
    if(response && response.ok){
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  }catch(err){
    return new Response('Sin conexión y sin copia en caché para este recurso.', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// Recursos externos (p. ej. Google Fonts): red primero, cache como respaldo
// offline. Igual que arriba, nunca debe resolver a undefined/null.
async function handleCrossOrigin(request){
  try{
    const response = await fetch(request);
    if(response && response.ok){
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  }catch(err){
    const cached = await caches.match(request);
    return cached || new Response('', { status: 504, statusText: 'Offline' });
  }
}
