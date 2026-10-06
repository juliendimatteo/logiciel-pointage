const CACHE = 'pointagepro-v4';
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
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FICHIERS_SHELL.map(f => new Request(f, { cache: 'reload' })))));
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
// « no-cache » force la revalidation auprès du serveur : sans cela, le cache HTTP
// du navigateur (10 min sur GitHub Pages) peut servir un app.js périmé à côté d'un
// index.html à jour. Hors-ligne, on retombe sur la copie sans paramètre de version.
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' })
      .then(reponse => {
        if (reponse.ok) {
          const copie = reponse.clone();
          caches.open(CACHE).then(cache => cache.put(request, copie));
        }
        return reponse;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }))
  );
});
