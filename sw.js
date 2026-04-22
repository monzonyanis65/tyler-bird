const CACHE_NAME = 'tyler-bird-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './assets/bird.png',
  './assets/bird_bishop.png',
  './assets/tower.png',
  './assets/background.png',
  './assets/game_over.mp3',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './manifest.json'
];

// Install: Cache everything
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force the new service worker to take over immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// Fetch: Network first, then cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
