let cacheName = "fill";
let filesToCache = [
    "/games/fill/",
    "/games/fill/index.html",
    "/games/fill/index.js",
    "/games/fill/index.css"
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
