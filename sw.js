const CACHE_NAME = 'geomotion-pro-v1';
const DYNAMIC_CACHE = 'geomotion-dynamic-v1';

// File inti yang wajib ada saat offline pertama kali
const PRECACHE_URLS = [
  './geomotion_pro.html',
  './manifest.json'
];

// 1. Install Event: Cache file statis utama
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching App Shell');
        return cache.addAll(PRECACHE_URLS);
      })
  );
});

// 2. Activate Event: Bersihkan cache lama jika ada update versi
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// 3. Fetch Event: Strategi "Cache First, lalu Network, lalu Cache Dynamic"
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Abaikan request chrome-extension atau non-http
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // A. Jika ada di cache, gunakan itu (Offline First)
      if (cachedResponse) {
        return cachedResponse;
      }

      // B. Jika tidak ada, ambil dari internet
      return fetch(event.request).then((networkResponse) => {
        // Cek validitas respon
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
          return networkResponse;
        }

        // C. Simpan respon baru ke Dynamic Cache (misal: Tile Peta, CDN Font, dll)
        const responseToCache = networkResponse.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
            // Batasi cache peta agar storage tidak penuh (opsional, logika sederhana di sini)
            cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // D. Jika offline dan tidak ada di cache
        console.log('[Service Worker] Offline and asset not found');
        // Bisa return halaman offline fallback custom di sini jika mau
      });
    })
  );
});
