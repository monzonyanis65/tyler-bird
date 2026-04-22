const CACHE_NAME = 'tyler-bird-v1';
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

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
