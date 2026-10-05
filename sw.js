// Service worker：快取 App 外殼，讓離線也能開啟。
// 修改任何靜態檔案後，請把 VERSION 加 1，舊快取才會被清掉。
const VERSION = 'v3';
const CACHE = `diary-shell-${VERSION}`;
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/tokens.css',
  'css/app.css',
  'js/app.js',
  'js/util.js',
  'js/store.js',
  'js/store-local.js',
  'js/image.js',
  'js/ai.js',
  'js/background.js',
  'js/views/editor.js',
  'js/views/calendar.js',
  'js/views/day.js',
  'js/views/settings.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' 跳過瀏覽器的 HTTP 快取，確保抓到最新檔案
  const requests = SHELL.map((url) => new Request(url, { cache: 'reload' }));
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(requests)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 只處理同源 GET：先用快取，沒有再連網路
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
