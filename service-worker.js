const CACHE = 'reynoso-drop-v1.7';
const SHELL = [
  './', './index.html', './styles.css', './theme.css', './favicon.svg', './manifest.webmanifest',
  './app.js', './session.js', './protocol.js', './files.js', './clipboard.js', './qr.js', './devices.js', './qrscan.js',
  './vendor/peerjs.min.js', './vendor/qrcode.js', './vendor/jsqr.js', './icons/icon-180.png', './icons/icon-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {});
      return response;
    }).catch(async () => (await caches.match(event.request, { ignoreSearch: true })) || caches.match('./index.html'))
  );
});