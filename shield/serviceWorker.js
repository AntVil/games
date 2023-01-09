let cacheName = "shield";
let filesToCache = [
    "/games/shield/",
    "/games/shield/index.html",
    "/games/shield/index.js",
    "/games/shield/index.css"
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(filesToCache)));
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
            return cachedResponse;
        }
        return fetch(event.request);
        }),
    );
});
