const CACHE = 'pointagepro-v1';
const FICHIERS_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FICHIERS_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cles => Promise.all(cles.filter(c => c !== CACHE).map(c => caches.delete(c))))
  );
  self.clients.claim();
});

// Réseau d'abord pour toujours servir la dernière version déployée ; le cache
// ne sert que de secours hors-ligne (Firestore/CDN externes ne sont jamais mis en cache).
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(reponse => {
        const copie = reponse.clone();
        caches.open(CACHE).then(cache => cache.put(request, copie));
        return reponse;
      })
      .catch(() => caches.match(request))
  );
});
